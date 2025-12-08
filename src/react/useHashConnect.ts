/**
 * React Hook for HashConnect SDK
 * 
 * Usage:
 * import { useHashConnect } from '@hashpass/connect/react';
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CONFIG } from '../config';

interface HashConnectState {
  isConnected: boolean;
  isLoading: boolean;
  userAddress: string | null;
  clubId: string | null;
  clubName: string | null;
  error: string | null;
  debug?: boolean;
}

export interface UseHashConnectOptions {
  debug?: boolean;
  disclaimer?: string;
}

export interface UseHashConnectReturn {
  isConnected: boolean;
  isLoading: boolean;
  userAddress: string | null;
  clubId: string | null;
  clubName: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  getClubId: () => string | null;
  getClubName: () => string | null;
  makeAuthRequest: <T>(url: string, options?: RequestInit) => Promise<T>;
}

/**
 * Helper to safely access storage - uses SDK's SafeStorage if available,
 * falls back to localStorage otherwise
 */
function getStorage() {
  if (window.HASHConnect && (window.HASHConnect as any)._storage) {
    return (window.HASHConnect as any)._storage;
  }
  // Fallback to localStorage
  return {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
    clear: () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('hc:'));
      keys.forEach(k => localStorage.removeItem(k));
    }
  };
}

export function useHashConnect(options: UseHashConnectOptions = {}): UseHashConnectReturn {
  const { debug = false, disclaimer } = options;
  
  const [state, setState] = useState<HashConnectState>({
    isConnected: false,
    isLoading: false,
    userAddress: null,
    clubId: null,
    clubName: null,
    error: null,
    debug,
  });

  const scriptLoadedRef = useRef(false);

  // Memoize log functions to prevent unnecessary callback recreations
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[useHashConnect]', ...args);
    }
  }, [debug]);

  const logError = useCallback((...args: any[]) => {
    if (debug) {
      console.error('[useHashConnect]', ...args);
    }
  }, [debug]);

  useEffect(() => {
    log('Hook mounted, initializing...');
    
    // Set debug mode in SDK config
    CONFIG.DEBUG = debug;
    
    // Set custom disclaimer if provided
    if (disclaimer) {
      CONFIG.CUSTOM_DISCLAIMER = disclaimer;
      log('Custom disclaimer set');
    }
    
    // SDK should already be initialized via the react module import
    if (!scriptLoadedRef.current) {
      log('HASHConnect available:', !!window.HASHConnect);
      
      if (window.HASHConnect) {
        log('HASHConnect methods:', Object.keys(window.HASHConnect));
      } else {
        logError('❌ HASHConnect SDK not initialized. Make sure you imported from @hashpass/connect/react');
      }
      
      scriptLoadedRef.current = true;
    }

    // Listen for connection events
    const handleHashConnectEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { eventType, user } = customEvent.detail;
      
      log('📨 Received hash-connect-event:', { eventType, user });

      if (eventType === "connected") {
        log('✅ Connected event received, updating state...');
        
        // Use safe storage access
        const storage = getStorage();
        const storedClubId = storage.getItem('hc:clubId');
        const storedClubName = storage.getItem('hc:clubName');

        setState((prev) => ({
          ...prev,
          isConnected: true,
          userAddress: user,
          clubId: storedClubId,
          clubName: storedClubName,
          isLoading: false,
          error: null,
        }));
      } else if (eventType === "disconnected") {
        log('🔌 Disconnected event received, clearing state...');
        setState((prev) => ({
          ...prev,
          isConnected: false,
          userAddress: null,
          clubId: null,
          clubName: null,
          isLoading: false,
        }));
      }
    };

    document.addEventListener("hash-connect-event", handleHashConnectEvent);
    log('✅ Event listener attached for hash-connect-event');

    // Check if already connected
    const checkConnection = setInterval(() => {
      if (window.HASHConnect?.isReady()) {
        log('✅ HASHConnect is ready, checking for existing user...');
        const user = window.HASHConnect.getUser();
        if (user?.address) {
          log('✅ Found existing user connection:', user.address);
          
          // Use safe storage access
          const storage = getStorage();
          const storedClubId = storage.getItem('hc:clubId');
          const storedClubName = storage.getItem('hc:clubName');
          
          setState((prev) => ({
            ...prev,
            isConnected: true,
            userAddress: user.address,
            clubId: storedClubId,
            clubName: storedClubName,
          }));
        } else {
          log('ℹ️ No existing user found');
        }
        clearInterval(checkConnection);
      }
    }, 100);

    return () => {
      log('Hook unmounting, cleaning up...');
      document.removeEventListener("hash-connect-event", handleHashConnectEvent);
      clearInterval(checkConnection);
    };
  }, [debug, disclaimer, log, logError]);

  const connect = useCallback(async () => {
    log('🔗 Connect method called');
    log('Checking if HASHConnect is available...');
    
    if (!window.HASHConnect) {
      const errorMsg = "HashConnect SDK not loaded";
      logError('❌', errorMsg);
      setState((prev) => ({
        ...prev,
        error: errorMsg,
      }));
      return;
    }

    log('✅ HASHConnect SDK is available');
    log('HASHConnect object:', window.HASHConnect);
    log('Setting loading state to true...');
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Add timeout to prevent stuck loading state
    const loadingTimeout = setTimeout(() => {
      log('⏱️ Connection timeout after 30 seconds');
      setState((prev) => {
        if (prev.isLoading) {
          logError('❌ Loading state stuck, resetting with timeout error');
          return { 
            ...prev, 
            isLoading: false, 
            error: 'Connection timeout - please try again' 
          };
        }
        return prev;
      });
    }, 30000); // 30 second timeout

    try {
      log('Calling window.HASHConnect.connect()...');
      await window.HASHConnect.connect();
      log('✅ Connect call completed');
      clearTimeout(loadingTimeout);
      // Explicitly clear loading state on success, don't rely solely on event
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error) {
      logError('❌ Error during connect:', error);
      clearTimeout(loadingTimeout);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [debug, log, logError]);

  const disconnect = useCallback(() => {
    log('🔌 Disconnect method called');
    
    try {
      log('Calling SDK disconnect method...');
      
      // Use the proper SDK disconnect method if available
      if (window.HASHConnect && typeof window.HASHConnect.disconnect === 'function') {
        log('✅ Using SDK disconnect method');
        window.HASHConnect.disconnect();
      } else {
        log('⚠️ SDK disconnect not available, falling back to manual cleanup');
        
        // Fallback: manual cleanup
        const storage = getStorage();
        storage.removeItem('hc:sessionId');
        storage.removeItem('hc:address');
        storage.removeItem('hc:accessToken');
        storage.removeItem('hc:refreshToken');
        storage.removeItem('hc:signature');
        storage.removeItem('hc:clubId');
        storage.removeItem('hc:clubName');
        
        // Dispatch disconnected event
        const event = new CustomEvent('hash-connect-event', {
          detail: {
            eventType: 'disconnected',
            user: null
          }
        });
        document.dispatchEvent(event);
      }
      
      log('✅ Disconnected successfully');
    } catch (error) {
      logError('❌ Error during disconnect:', error);
    }
  }, [log, logError]);

  const getToken = useCallback(async () => {
    log('🎫 getToken called');
    
    if (!window.HASHConnect) {
      logError('❌ HASHConnect not available');
      return null;
    }
    
    log('Calling window.HASHConnect.getToken()...');
    const token = await window.HASHConnect.getToken();
    
    if (token) {
      log('✅ Token retrieved successfully');
    } else {
      logError('❌ No token returned');
    }
    
    return token;
  }, [debug]);

  const getClubId = useCallback(() => {
    log('🏢 getClubId called');
    
    if (!window.HASHConnect) {
      logError('❌ HASHConnect not available');
      return null;
    }
    
    log('Calling window.HASHConnect.getClubId()...');
    const clubId = window.HASHConnect.getClubId();
    
    if (clubId) {
      log('✅ Club ID retrieved successfully:', clubId);
    } else {
      log('ℹ️ No club ID available');
    }
    
    return clubId;
  }, [debug]);

  const getClubName = useCallback(() => {
    log('🏢 getClubName called');
    
    if (!window.HASHConnect) {
      logError('❌ HASHConnect not available');
      return null;
    }
    
    log('Calling window.HASHConnect.getClubName()...');
    const clubName = window.HASHConnect.getClubName();
    
    if (clubName) {
      log('✅ Club Name retrieved successfully:', clubName);
    } else {
      log('ℹ️ No club Name available');
    }
    
    return clubName;
  }, [debug]);

  const makeAuthRequest = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      return response.json();
    },
    [getToken]
  );

  return {
    ...state,
    connect,
    disconnect,
    getToken,
    getClubId,
    getClubName,
    makeAuthRequest,
  };
}

