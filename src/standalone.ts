/**
 * Standalone functions for non-React code
 * 
 * These functions provide access to HashConnect authentication state
 * outside of React components (e.g., API interceptors, utility functions).
 * 
 * @example
 * ```typescript
 * // In an API interceptor
 * import { getAccessToken } from '@hashpass/connect';
 * 
 * api.interceptors.request.use(async (config) => {
 *   const token = await getAccessToken();
 *   if (token) {
 *     config.headers.Authorization = `Bearer ${token}`;
 *   }
 *   return config;
 * });
 * ```
 */

import { CONFIG } from './config';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_PREFIX = 'hc:';

const STORAGE_KEYS = {
  ACCESS_TOKEN: `${STORAGE_PREFIX}accessToken`,
  REFRESH_TOKEN: `${STORAGE_PREFIX}refreshToken`,
  ADDRESS: `${STORAGE_PREFIX}address`,
  CLUB_ID: `${STORAGE_PREFIX}clubId`,
  CLUB_NAME: `${STORAGE_PREFIX}clubName`,
  SIGNATURE: `${STORAGE_PREFIX}signature`,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if localStorage is available (SSR-safe)
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a token is a valid JWT format and not expired
 * Duplicates logic from HashConnectProvider to avoid React dependencies
 */
function validateTokenFormat(token: string | null): boolean {
  if (!token || typeof token !== 'string') return false;

  try {
    // Check JWT format (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Try to decode and parse the payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const parsed = JSON.parse(jsonPayload);

    // Check for expiration claim
    if (!parsed.exp || typeof parsed.exp !== 'number') return false;

    // Check if token is expired
    if (Date.now() >= parsed.exp * 1000) return false;

    return true;
  } catch {
    // Any parsing error means invalid token
    return false;
  }
}

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(
  refreshToken: string,
  address: string
): Promise<string | null> {
  if (!refreshToken || !address) return null;

  try {
    const response = await fetch(`${CONFIG.AUTH_ENDPOINT}/auth/refresh`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${refreshToken}`,
        'x-hp-hash': address,
        'x-hp-device': typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.accessToken && data.refreshToken) {
      // Update storage with new tokens
      if (isStorageAvailable()) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      }

      return data.accessToken;
    }

    return null;
  } catch (error) {
    console.error('[HashConnect Standalone] Token refresh failed:', error);
    return null;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get a valid access token (attempts refresh if expired)
 * 
 * This function reads the token from localStorage, validates it, and attempts
 * to refresh it if expired. Returns null if no valid token is available.
 * 
 * @returns Promise resolving to valid access token or null
 * 
 * @example
 * ```typescript
 * const token = await getAccessToken();
 * if (token) {
 *   // Use token for authenticated request
 *   fetch('/api/data', {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 * }
 * ```
 */
export async function getAccessToken(): Promise<string | null> {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    // No token available
    if (!token) {
      return null;
    }

    // Token is valid and not expired
    if (validateTokenFormat(token)) {
      return token;
    }

    // Token is expired or invalid, try to refresh
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const address = localStorage.getItem(STORAGE_KEYS.ADDRESS);

    if (!refreshToken || !address) {
      return null;
    }

    // Attempt refresh
    const newToken = await refreshAccessToken(refreshToken, address);
    return newToken;
  } catch (error) {
    console.error('[HashConnect Standalone] getAccessToken failed:', error);
    return null;
  }
}

/**
 * Get the current authentication state (synchronous)
 * 
 * This function reads the current authentication state from localStorage
 * without attempting to refresh tokens. Use this for quick checks.
 * 
 * @returns Object with authentication state
 * 
 * @example
 * ```typescript
 * const { isAuthenticated, userAddress, clubId } = getAuthState();
 * if (isAuthenticated) {
 *   console.log('User is authenticated:', userAddress);
 * }
 * ```
 */
export function getAuthState(): {
  isAuthenticated: boolean;
  userAddress: string | null;
  clubId: string | null;
} {
  if (!isStorageAvailable()) {
    return {
      isAuthenticated: false,
      userAddress: null,
      clubId: null,
    };
  }

  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const address = localStorage.getItem(STORAGE_KEYS.ADDRESS);
    const clubId = localStorage.getItem(STORAGE_KEYS.CLUB_ID);

    // Check if token exists and is valid
    const isAuthenticated = validateTokenFormat(token);

    return {
      isAuthenticated,
      userAddress: address,
      clubId,
    };
  } catch (error) {
    console.error('[HashConnect Standalone] getAuthState failed:', error);
    return {
      isAuthenticated: false,
      userAddress: null,
      clubId: null,
    };
  }
}
