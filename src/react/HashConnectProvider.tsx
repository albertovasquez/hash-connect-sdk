'use client';

/**
 * HashConnect Provider - React-Only Architecture (v3)
 * 
 * This provider manages all authentication state directly in React,
 * without relying on window.HASHConnect or CustomEvents.
 * 
 * @example
 * ```tsx
 * import { HashConnectProvider, useHashConnect } from '@hashpass/connect';
 * 
 * function App() {
 *   return (
 *     <HashConnectProvider disclaimer="By connecting, you agree to our terms.">
 *       <MyApp />
 *     </HashConnectProvider>
 *   );
 * }
 * ```
 */

import React, { useState, useCallback, useEffect, useRef, useContext, useMemo } from 'react';
import { usePusher } from './hooks/usePusher';
import { useStorage, STORAGE_KEYS } from './hooks/useStorage';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { HashConnectModal } from './components/HashConnectModal';
import { HashConnectContext, initialAuthState } from './HashConnectContext';
import { CONFIG } from '../config';
import type { PusherChannel } from '../types/pusher';
import type { AuthState, HashConnectContextType } from './HashConnectContext';

// Re-export types from context
export type { AuthState, HashConnectContextType } from './HashConnectContext';

// ============================================================================
// Types
// ============================================================================

export interface HashConnectConfig {
  /** Pusher app key */
  pusherKey?: string;
  /** Pusher cluster */
  pusherCluster?: string;
  /** Auth endpoint URL */
  authEndpoint?: string;
}

export interface HashConnectProviderProps {
  children: React.ReactNode;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom disclaimer text shown in modal */
  disclaimer?: string;
  /** Custom configuration (optional, uses defaults) */
  config?: HashConnectConfig;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate that a token is a valid JWT format and not expired
 * Used for cross-tab synchronization to avoid setting isConnected with invalid tokens
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

// ============================================================================
// Provider Component
// ============================================================================

export const HashConnectProvider: React.FC<HashConnectProviderProps> = ({
  children,
  debug = false,
  disclaimer,
  config = {},
}) => {
  // Merge config with defaults
  const pusherKey = config.pusherKey || CONFIG.PUSHER_KEY;
  const pusherCluster = config.pusherCluster || CONFIG.PUSHER_CLUSTER;
  const authEndpoint = config.authEndpoint || CONFIG.AUTH_ENDPOINT;

  // =========================================================================
  // Logging (defined early so it can be used by all hooks and callbacks)
  // =========================================================================

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log('[HashConnect]', ...args);
  }, [debug]);

  // =========================================================================
  // State
  // =========================================================================
  
  const [state, setState] = useState<AuthState>(initialAuthState);
  const sessionChannelRef = useRef<PusherChannel | null>(null);
  const userChannelRef = useRef<PusherChannel | null>(null);
  
  // Ref for sessionId to ensure handlers always have the current value
  // This is necessary because handlers are bound before state updates complete
  const sessionIdRef = useRef<string | null>(null);
  
  // Ref for handleDisconnect to allow callbacks to access current version
  // This avoids circular dependencies with useTokenRefresh callbacks
  const handleDisconnectRef = useRef<() => void>(() => {});
  
  // Ref to store the subscription_succeeded handler for cleanup
  // This prevents duplicate handlers when reconnecting with the same address
  const subscriptionSucceededHandlerRef = useRef<((data: any) => void) | null>(null);

  // =========================================================================
  // Hooks
  // =========================================================================

  const storage = useStorage({ prefix: 'hc:', syncAcrossTabs: true });

  const {
    client: pusherClient,
    connectionState,
    subscribe,
    unsubscribe,
    disconnect: disconnectPusher,
    isReady: pusherReady,
  } = usePusher({
    key: pusherKey,
    cluster: pusherCluster,
    authEndpoint: `${authEndpoint}/auth/pusher`,
    debug,
  });

  const { refresh: refreshTokens, isTokenExpired } = useTokenRefresh({
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    address: state.userAddress,
    debug,
    authEndpoint,
    onTokensRefreshed: (tokens) => {
      log('✅ Tokens refreshed proactively');
      setState(prev => ({
        ...prev,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }));
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    },
    onRefreshFailed: (error) => {
      log('❌ Token refresh failed:', error);
      if (error.shouldDisconnect) {
        log('🚪 Disconnecting due to unrecoverable token error');
        handleDisconnectRef.current();
      }
    },
  });

  // =========================================================================
  // Load stored session on mount
  // =========================================================================

  useEffect(() => {
    const storedToken = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedAddress = storage.getItem(STORAGE_KEYS.ADDRESS);

    if (storedToken && storedAddress) {
      log('✅ Found stored session, restoring...');
      
      // Validate token before considering connected (same logic as cross-tab sync)
      // This prevents reporting isConnected: true with corrupted/expired tokens
      const isValidToken = validateTokenFormat(storedToken);
      
      if (!isValidToken) {
        log('⚠️ Stored token is invalid or expired, clearing session');
        // Clear invalid session from storage
        storage.clear();
        return;
      }
      
      const storedSessionId = storage.getItem(STORAGE_KEYS.SESSION_ID);
      
      // Update ref to keep it in sync with restored state
      sessionIdRef.current = storedSessionId;
      
      setState(prev => ({
        ...prev,
        accessToken: storedToken,
        refreshToken: storage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        userAddress: storedAddress,
        signature: storage.getItem(STORAGE_KEYS.SIGNATURE),
        clubId: storage.getItem(STORAGE_KEYS.CLUB_ID),
        clubName: storage.getItem(STORAGE_KEYS.CLUB_NAME),
        sessionId: storedSessionId,
        isConnected: true,
      }));
    } else {
      log('ℹ️ No stored session found');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // Cross-tab synchronization
  // =========================================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key?.startsWith('hc:')) return;

      log('📦 Storage changed in another tab:', event.key);

      // Another tab disconnected (accessToken removed)
      if (event.key === 'hc:accessToken' && !event.newValue && event.oldValue) {
        log('🔌 Disconnect detected from another tab');
        setState(initialAuthState);
        return;
      }

      // Another tab updated any HashConnect storage key
      // This includes: accessToken, refreshToken, address, clubId, clubName, signature, sessionId
      // We need to sync ALL fields to prevent stale data
      const relevantKeys = [
        'hc:accessToken',
        'hc:refreshToken',
        'hc:address',
        'hc:clubId',
        'hc:clubName',
        'hc:signature',
        'hc:sessionId',
      ];
      
      if (relevantKeys.includes(event.key)) {
        log('🔄 Session data changed in another tab, syncing all fields...');
        
        // Read ALL session fields from storage to stay in complete sync
        const storedToken = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const storedAddress = storage.getItem(STORAGE_KEYS.ADDRESS);
        const storedRefreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const storedClubId = storage.getItem(STORAGE_KEYS.CLUB_ID);
        const storedClubName = storage.getItem(STORAGE_KEYS.CLUB_NAME);
        const storedSignature = storage.getItem(STORAGE_KEYS.SIGNATURE);
        const storedSessionId = storage.getItem(STORAGE_KEYS.SESSION_ID);
        
        // Update sessionIdRef to keep it in sync
        sessionIdRef.current = storedSessionId;
        
        // Validate token before considering connected
        // Check both that address exists AND token is valid (parseable and not expired)
        const isValidToken = storedToken ? validateTokenFormat(storedToken) : false;
        const shouldBeConnected = !!storedAddress && isValidToken;
        
        if (storedToken && !isValidToken) {
          log('⚠️ Token from another tab is invalid or expired, not setting connected');
        }
        
        setState(prev => ({
          ...prev,
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          userAddress: storedAddress,
          clubId: storedClubId,
          clubName: storedClubName,
          signature: storedSignature,
          sessionId: storedSessionId,
          isConnected: shouldBeConnected,
        }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [log, storage]);

  // =========================================================================
  // Pusher Event Handlers
  // =========================================================================

  /**
   * Handle when mobile app scans QR code
   * Receives address and signature, then subscribes to user channel
   * Uses sessionIdRef to ensure we have the current session ID (not stale from closure)
   */
  const handleHashPassConnect = useCallback((data: { address: string; signature: string }) => {
    log('📱 Mobile app connected:', data.address);

    // Subscribe to user's private channel
    const userChannelName = `private-${data.address}`;
    const userChannel = subscribe(userChannelName);
    
    if (!userChannel) {
      log('❌ Failed to subscribe to user channel');
      return;
    }

    // Clean up any existing subscription_succeeded handler before binding a new one
    // This prevents duplicate handlers if the user reconnects with the same address
    if (subscriptionSucceededHandlerRef.current && userChannelRef.current) {
      log('🧹 Cleaning up old subscription_succeeded handler');
      userChannelRef.current.unbind('pusher:subscription_succeeded', subscriptionSucceededHandlerRef.current);
      subscriptionSucceededHandlerRef.current = null;
    }

    userChannelRef.current = userChannel;

    // Create and store the handler so we can unbind it later
    const subscriptionSucceededHandler = () => {
      log('✅ Subscribed to user channel, requesting authorization...');
      
      // Use ref to get current sessionId (avoids stale closure issue)
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        log('❌ No session ID available');
        return;
      }
      
      // Send authorization request to mobile app
      userChannel.trigger('client-request-user-to-authorize-from-site', {
        signature: data.signature,
        channel: `private-hc-${currentSessionId}`,
        domain: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        name: typeof document !== 'undefined' ? document.title || 'Unknown site' : 'Unknown site',
      });
    };

    // Store reference for cleanup
    subscriptionSucceededHandlerRef.current = subscriptionSucceededHandler;

    // Bind the handler
    userChannel.bind('pusher:subscription_succeeded', subscriptionSucceededHandler);

    // Update state with address and signature
    setState(prev => ({
      ...prev,
      userAddress: data.address,
      signature: data.signature,
    }));

    storage.setItem(STORAGE_KEYS.ADDRESS, data.address);
    storage.setItem(STORAGE_KEYS.SIGNATURE, data.signature);
  }, [subscribe, storage, log]);

  /**
   * Handle authorization from mobile app
   * Receives tokens and club info
   */
  const handleAuthorization = useCallback((data: {
    address: string;
    accessToken: string;
    refreshToken: string;
    clubId?: string;
    clubName?: string;
  }) => {
    log('✅ Authorization received:', { address: data.address, hasTokens: !!data.accessToken });

    // Store tokens
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    storage.setItem(STORAGE_KEYS.ADDRESS, data.address);
    if (data.clubId) storage.setItem(STORAGE_KEYS.CLUB_ID, data.clubId);
    if (data.clubName) storage.setItem(STORAGE_KEYS.CLUB_NAME, data.clubName);

    // Update state
    setState(prev => ({
      ...prev,
      isConnected: true,
      isLoading: false,
      isModalOpen: false,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userAddress: data.address,
      clubId: data.clubId || null,
      clubName: data.clubName || null,
      error: null,
    }));

    log('✅ Connection complete!');
  }, [storage, log]);

  /**
   * Disconnect and cleanup
   * Uses refs to ensure we have current values (not stale from closure)
   */
  const handleDisconnect = useCallback(() => {
    log('🔌 Disconnecting...');

    // Clean up subscription_succeeded handler if it exists
    if (subscriptionSucceededHandlerRef.current && userChannelRef.current) {
      log('🧹 Unbinding subscription_succeeded handler');
      userChannelRef.current.unbind('pusher:subscription_succeeded', subscriptionSucceededHandlerRef.current);
      subscriptionSucceededHandlerRef.current = null;
    }

    // Unsubscribe from channels using ref for sessionId (ensures current value)
    const currentSessionId = sessionIdRef.current;
    if (currentSessionId) {
      unsubscribe(`private-hc-${currentSessionId}`);
    }
    if (state.userAddress) {
      unsubscribe(`private-${state.userAddress}`);
    }

    // Disconnect from Pusher to properly cleanup the connection
    disconnectPusher();

    // Clear all refs
    sessionChannelRef.current = null;
    userChannelRef.current = null;
    sessionIdRef.current = null;

    // Clear storage
    storage.clear();

    // Reset state
    setState(initialAuthState);

    log('✅ Disconnected');
  }, [state.userAddress, unsubscribe, disconnectPusher, storage, log]);

  // Keep ref in sync with current handleDisconnect
  useEffect(() => {
    handleDisconnectRef.current = handleDisconnect;
  }, [handleDisconnect]);

  /**
   * Handle unauthorization (revoke) from mobile app
   */
  const handleUnauthorization = useCallback(() => {
    log('🔌 Unauthorization received from mobile app');
    handleDisconnectRef.current();
  }, [log]);

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Start connection flow
   */
  const connect = useCallback(async () => {
    if (state.isConnected) {
      log('⚠️ Already connected');
      return;
    }

    if (state.isLoading) {
      log('⚠️ Connection already in progress');
      return;
    }

    if (!pusherReady) {
      log('⚠️ Pusher not ready yet');
      setState(prev => ({ ...prev, error: 'Connection not ready. Please try again.' }));
      return;
    }

    log('🔗 Starting connection...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate new session ID
      const sessionId = Math.random().toString(36).slice(2);
      const channelName = `private-hc-${sessionId}`;

      log('📺 Subscribing to session channel:', channelName);

      // Subscribe to session channel
      const channel = subscribe(channelName);
      if (!channel) {
        throw new Error('Failed to subscribe to session channel');
      }

      sessionChannelRef.current = channel;

      // Store session ID in ref BEFORE binding handlers
      // This ensures handlers have access to the sessionId via ref (not stale closure)
      sessionIdRef.current = sessionId;
      storage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);

      // Bind event handlers (they will use sessionIdRef.current)
      channel.bind('client-hash-pass-connect', handleHashPassConnect);
      channel.bind('client-send-authorization-to-site', handleAuthorization);
      channel.bind('client-send-unauthorization-to-site', handleUnauthorization);

      // Update state and open modal
      // Reset isLoading since we've transitioned from "initializing" to "waiting for user"
      setState(prev => ({
        ...prev,
        sessionId,
        isModalOpen: true,
        isLoading: false,
      }));

      log('✅ Session created, modal opened');
    } catch (error) {
      log('❌ Connection error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, [
    state.isConnected,
    state.isLoading,
    pusherReady,
    subscribe,
    storage,
    handleHashPassConnect,
    handleAuthorization,
    handleUnauthorization,
    log,
  ]);

  /**
   * Get valid access token (refreshes if expired)
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    const currentToken = state.accessToken;
    
    if (!currentToken) {
      log('❌ No access token available');
      return null;
    }

    // Check if THIS specific token is expired (not the ref)
    // This ensures we validate the same token we're checking and potentially returning
    if (isTokenExpired(currentToken)) {
      log('⚠️ Token expired, refreshing...');
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    return currentToken;
  }, [state.accessToken, isTokenExpired, refreshTokens, log]);

  /**
   * Get club ID
   */
  const getClubId = useCallback((): string | null => {
    return state.clubId || storage.getItem(STORAGE_KEYS.CLUB_ID);
  }, [state.clubId, storage]);

  /**
   * Get club name
   */
  const getClubName = useCallback((): string | null => {
    return state.clubName || storage.getItem(STORAGE_KEYS.CLUB_NAME);
  }, [state.clubName, storage]);

  /**
   * Make authenticated API request
   * 
   * Content-Type is only set to application/json when:
   * - No Content-Type header is provided by the user
   * - The body is NOT FormData, Blob, ArrayBuffer, or other non-JSON types
   * 
   * This allows proper handling of file uploads (FormData) and binary data.
   */
  const makeAuthRequest = useCallback(async <T,>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = await getToken();

    if (!token) {
      throw new Error('No authentication token available');
    }

    // Determine if we should set Content-Type: application/json
    // Don't set it for FormData, Blob, ArrayBuffer, etc. as the browser handles these
    const userHeaders = options.headers || {};
    
    // Helper to check if headers contain Content-Type
    // Headers can be: Headers object, plain object, or array of tuples
    const hasUserContentType = (() => {
      if (userHeaders instanceof Headers) {
        return userHeaders.has('Content-Type');
      }
      if (Array.isArray(userHeaders)) {
        // Array of tuples: [['Content-Type', 'application/json'], ...]
        // Validate each entry is an array before destructuring to handle malformed input
        return userHeaders.some((entry) => {
          if (!Array.isArray(entry) || entry.length < 2) return false;
          const [key] = entry;
          return typeof key === 'string' && key.toLowerCase() === 'content-type';
        });
      }
      // Plain object
      return Object.keys(userHeaders).some(
        key => key.toLowerCase() === 'content-type'
      );
    })();
    
    // Check if body is a type that should NOT have application/json Content-Type
    const body = options.body;
    const isNonJsonBody = body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      body instanceof URLSearchParams ||
      (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream);
    
    // Build headers: only add Content-Type: application/json if appropriate
    // Convert Headers/arrays to plain object for easier manipulation
    let baseHeaders: Record<string, string> = {};
    if (userHeaders instanceof Headers) {
      userHeaders.forEach((value, key) => {
        baseHeaders[key] = value;
      });
    } else if (Array.isArray(userHeaders)) {
      // Array of tuples: [['X-Custom', 'value'], ...]
      for (const entry of userHeaders) {
        if (Array.isArray(entry) && entry.length >= 2) {
          const [key, value] = entry;
          if (typeof key === 'string' && typeof value === 'string') {
            baseHeaders[key] = value;
          }
        }
      }
    } else {
      baseHeaders = userHeaders as Record<string, string>;
    }
    
    const headers: Record<string, string> = {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    };
    
    // Only set Content-Type if user didn't provide one AND body is JSON-compatible
    if (!hasUserContentType && !isNonJsonBody) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }, [getToken]);

  /**
   * Close modal
   */
  const handleCloseModal = useCallback(() => {
    log('🔒 Modal closed');
    
    // If not connected yet, cleanup channels but preserve user identification
    // This handles the case where user scanned QR (handleHashPassConnect ran)
    // but closed the modal before authorization completed
    if (!state.isConnected) {
      // Clean up subscription_succeeded handler if it exists
      if (subscriptionSucceededHandlerRef.current && userChannelRef.current) {
        log('🧹 Unbinding subscription_succeeded handler on modal close');
        userChannelRef.current.unbind('pusher:subscription_succeeded', subscriptionSucceededHandlerRef.current);
        subscriptionSucceededHandlerRef.current = null;
      }

      // Cleanup session channel (session-specific, always clear)
      if (state.sessionId) {
        unsubscribe(`private-hc-${state.sessionId}`);
        storage.removeItem(STORAGE_KEYS.SESSION_ID);
      }
      
      // Cleanup user channel subscription if one was created (QR was scanned)
      // But preserve userAddress and signature for potential re-connection
      // or for parent app to know a partial connection was attempted
      if (state.userAddress) {
        unsubscribe(`private-${state.userAddress}`);
        // Note: We intentionally DO NOT clear ADDRESS and SIGNATURE from storage
        // These are user identification data that should persist for re-connection attempts
      }
      
      // Clear channel refs
      sessionChannelRef.current = null;
      userChannelRef.current = null;
      sessionIdRef.current = null;
      
      // Reset session-specific state but preserve user identification data
      // userAddress and signature are kept so parent app knows user scanned QR
      setState(prev => ({
        ...prev,
        isModalOpen: false,
        isLoading: false,
        isConnected: false,
        sessionId: null,
        accessToken: null,
        refreshToken: null,
        clubId: null,
        clubName: null,
        error: null,
        // Preserve: userAddress, signature (user identification from QR scan)
      }));
    } else {
      // Already connected, just close the modal
      setState(prev => ({
        ...prev,
        isModalOpen: false,
        isLoading: false,
      }));
    }
  }, [state.isConnected, state.sessionId, state.userAddress, unsubscribe, storage, log]);

  // =========================================================================
  // Context Value
  // =========================================================================

  // Memoize context value to prevent unnecessary re-renders of consuming components
  // Only creates a new object reference when actual values change
  const contextValue = useMemo<HashConnectContextType>(() => ({
    ...state,
    connect,
    disconnect: handleDisconnect,
    getToken,
    getClubId,
    getClubName,
    connectionState,
    makeAuthRequest,
  }), [
    state,
    connect,
    handleDisconnect,
    getToken,
    getClubId,
    getClubName,
    connectionState,
    makeAuthRequest,
  ]);

  // =========================================================================
  // Render
  // =========================================================================

  const sessionUrl = state.sessionId ? `hc:${state.sessionId}` : '';

  return (
    <HashConnectContext.Provider value={contextValue}>
      {children}

      <HashConnectModal
        isOpen={state.isModalOpen}
        onClose={handleCloseModal}
        sessionUrl={sessionUrl}
        connectionState={connectionState}
        disclaimer={disclaimer}
      />
    </HashConnectContext.Provider>
  );
};

// ============================================================================
// Hook to access context
// ============================================================================

export const useHashConnectContext = (): HashConnectContextType => {
  const context = useContext(HashConnectContext);
  if (!context) {
    throw new Error('useHashConnectContext must be used within HashConnectProvider');
  }
  return context;
};

export default HashConnectProvider;
