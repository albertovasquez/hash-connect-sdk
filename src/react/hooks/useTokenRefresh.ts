/**
 * React hook for automatic token refresh
 * SSR-safe: handles token expiration and proactive refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CONFIG } from '../../config';

// Token refresh configuration
const TOKEN_REFRESH_CONFIG = {
  /** Minutes before expiry to trigger proactive refresh */
  refreshBeforeExpiryMinutes: 5,
  /** Interval to check token expiry (ms) */
  checkIntervalMs: 60000,
  /** Maximum consecutive refresh failures before giving up */
  maxFailures: 3,
  /** Request timeout (ms) */
  requestTimeoutMs: 10000,
};

export interface UseTokenRefreshOptions {
  /** Current access token */
  accessToken: string | null;
  /** Current refresh token */
  refreshToken: string | null;
  /** User's address */
  address: string | null;
  /** Callback when tokens are refreshed successfully */
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  /** Callback when refresh fails */
  onRefreshFailed: (error: TokenRefreshError) => void;
  /** Enable debug logging */
  debug?: boolean;
  /** Auth endpoint URL (defaults to CONFIG.AUTH_ENDPOINT) */
  authEndpoint?: string;
}

export interface UseTokenRefreshReturn {
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Last refresh error */
  error: TokenRefreshError | null;
  /** Number of consecutive failures */
  failureCount: number;
  /** Manually trigger a token refresh */
  refresh: () => Promise<{ accessToken: string; refreshToken: string } | null>;
  /** Check if token is expired */
  isTokenExpired: () => boolean;
  /** Get time until token expires (in minutes) */
  getTimeUntilExpiry: () => number | null;
}

export interface TokenRefreshError {
  type: 'UNRECOVERABLE' | 'TRANSIENT' | 'UNKNOWN';
  message: string;
  originalError: Error;
  shouldDisconnect: boolean;
  canRetry: boolean;
}

/**
 * Parse JWT token payload
 */
function parseJwt(token: string): { exp: number; [key: string]: unknown } | null {
  // SSR safety
  if (typeof window === 'undefined') return null;
  
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const parsed = JSON.parse(jsonPayload);
    
    if (!parsed.exp || typeof parsed.exp !== 'number') return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 */
function isExpired(token: string): boolean {
  const parsed = parseJwt(token);
  if (!parsed?.exp) return true;
  return Date.now() >= parsed.exp * 1000;
}

/**
 * Get minutes until token expires
 */
function getMinutesUntilExpiry(token: string): number | null {
  const parsed = parseJwt(token);
  if (!parsed?.exp) return null;
  return (parsed.exp * 1000 - Date.now()) / 1000 / 60;
}

/**
 * Classify token refresh errors
 */
function classifyError(error: Error): TokenRefreshError {
  const message = error.message.toLowerCase();

  // Unrecoverable errors - require re-authentication
  if (
    message.includes('no address') ||
    message.includes('no refresh token') ||
    /status: 401(?:\D|$)/.test(message) ||
    /status: 403(?:\D|$)/.test(message) ||
    message.includes('missing tokens')
  ) {
    return {
      type: 'UNRECOVERABLE',
      message: 'Invalid or expired credentials',
      originalError: error,
      shouldDisconnect: true,
      canRetry: false,
    };
  }

  // Transient errors - network issues, can retry
  if (
    message.includes('aborted') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('fetch') ||
    /status: 5\d\d/.test(message)
  ) {
    return {
      type: 'TRANSIENT',
      message: 'Network or server error',
      originalError: error,
      shouldDisconnect: false,
      canRetry: true,
    };
  }

  // Unknown errors
  return {
    type: 'UNKNOWN',
    message: 'Unknown error during token refresh',
    originalError: error,
    shouldDisconnect: false,
    canRetry: true,
  };
}

/**
 * Hook for automatic token refresh with proactive monitoring
 * 
 * @example
 * ```tsx
 * const { isRefreshing, refresh, isTokenExpired } = useTokenRefresh({
 *   accessToken,
 *   refreshToken,
 *   address,
 *   onTokensRefreshed: (tokens) => {
 *     setAccessToken(tokens.accessToken);
 *     setRefreshToken(tokens.refreshToken);
 *   },
 *   onRefreshFailed: (error) => {
 *     if (error.shouldDisconnect) {
 *       disconnect();
 *     }
 *   },
 * });
 * ```
 */
export function useTokenRefresh(options: UseTokenRefreshOptions): UseTokenRefreshReturn {
  const {
    accessToken,
    refreshToken,
    address,
    onTokensRefreshed,
    onRefreshFailed,
    debug = false,
    authEndpoint = CONFIG.AUTH_ENDPOINT,
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<TokenRefreshError | null>(null);
  const [failureCount, setFailureCount] = useState(0);

  // Use refs to prevent stale closures in interval callback
  const accessTokenRef = useRef(accessToken);
  const refreshTokenRef = useRef(refreshToken);
  const addressRef = useRef(address);
  const isRefreshingRef = useRef(false);

  // Update refs when props change
  useEffect(() => {
    accessTokenRef.current = accessToken;
    refreshTokenRef.current = refreshToken;
    addressRef.current = address;
  }, [accessToken, refreshToken, address]);

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log('[useTokenRefresh]', ...args);
  }, [debug]);

  /**
   * Perform the actual token refresh API call
   */
  const performRefresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const currentRefreshToken = refreshTokenRef.current;
    const currentAddress = addressRef.current;

    if (!currentAddress) {
      throw new Error('No address found');
    }

    if (!currentRefreshToken) {
      throw new Error('No refresh token found');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TOKEN_REFRESH_CONFIG.requestTimeoutMs);

    try {
      const response = await fetch(`${authEndpoint}/auth/refresh`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${currentRefreshToken}`,
          'x-hp-hash': currentAddress,
          'x-hp-device': typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Token refresh failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.accessToken || !data.refreshToken) {
        throw new Error('Invalid response: missing tokens');
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }, [authEndpoint]);

  /**
   * Manual refresh function exposed to consumers
   */
  const refresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
    // SSR safety
    if (typeof window === 'undefined') return null;

    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      log('Refresh already in progress, skipping');
      return null;
    }

    if (!refreshTokenRef.current || !addressRef.current) {
      log('Missing credentials for refresh');
      return null;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setError(null);

    try {
      log('Starting token refresh...');
      const tokens = await performRefresh();
      
      log('Token refresh successful');
      setFailureCount(0);
      onTokensRefreshed(tokens);
      
      return tokens;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const classified = classifyError(error);
      
      log('Token refresh failed:', classified);
      setError(classified);
      setFailureCount(prev => prev + 1);
      onRefreshFailed(classified);
      
      return null;
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [performRefresh, onTokensRefreshed, onRefreshFailed, log]);

  /**
   * Check if current token is expired
   */
  const isTokenExpired = useCallback((): boolean => {
    if (!accessTokenRef.current) return true;
    return isExpired(accessTokenRef.current);
  }, []);

  /**
   * Get time until token expires
   */
  const getTimeUntilExpiry = useCallback((): number | null => {
    if (!accessTokenRef.current) return null;
    return getMinutesUntilExpiry(accessTokenRef.current);
  }, []);

  /**
   * Proactive token refresh monitoring
   */
  useEffect(() => {
    // SSR safety
    if (typeof window === 'undefined') return;

    // Don't monitor if no token
    if (!accessToken) return;

    log('Starting proactive token monitoring');

    const checkAndRefresh = async () => {
      const currentToken = accessTokenRef.current;
      if (!currentToken || isRefreshingRef.current) return;

      const minutesUntilExpiry = getMinutesUntilExpiry(currentToken);
      
      if (minutesUntilExpiry === null) {
        log('Unable to parse token expiry');
        return;
      }

      // Check if we should refresh
      if (minutesUntilExpiry > TOKEN_REFRESH_CONFIG.refreshBeforeExpiryMinutes) {
        return; // Token still has plenty of time
      }

      if (failureCount >= TOKEN_REFRESH_CONFIG.maxFailures) {
        log('Max failures reached, stopping proactive refresh');
        return;
      }

      log(`Token expires in ${minutesUntilExpiry.toFixed(1)} minutes, refreshing proactively`);
      await refresh();
    };

    // Check immediately
    checkAndRefresh();

    // Set up interval
    const intervalId = setInterval(checkAndRefresh, TOKEN_REFRESH_CONFIG.checkIntervalMs);

    return () => {
      log('Stopping proactive token monitoring');
      clearInterval(intervalId);
    };
  }, [accessToken, failureCount, refresh, log]);

  // Reset failure count when tokens change (successful refresh or new login)
  useEffect(() => {
    if (accessToken && refreshToken) {
      setFailureCount(0);
      setError(null);
    }
  }, [accessToken, refreshToken]);

  return {
    isRefreshing,
    error,
    failureCount,
    refresh,
    isTokenExpired,
    getTimeUntilExpiry,
  };
}
