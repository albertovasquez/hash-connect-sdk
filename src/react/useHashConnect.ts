/**
 * React Hook for HashConnect SDK
 * 
 * Usage:
 * import { useHashConnect } from '@hashpass/connect/react';
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface HashConnectState {
  isConnected: boolean;
  isLoading: boolean;
  userAddress: string | null;
  error: string | null;
  debug?: boolean;
}

export interface UseHashConnectOptions {
  debug?: boolean;
}

export interface UseHashConnectReturn {
  isConnected: boolean;
  isLoading: boolean;
  userAddress: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  makeAuthRequest: <T>(url: string, options?: RequestInit) => Promise<T>;
}

export function useHashConnect(options: UseHashConnectOptions = {}): UseHashConnectReturn {
  const { debug = false } = options;
  
  const [state, setState] = useState<HashConnectState>({
    isConnected: false,
    isLoading: false,
    userAddress: null,
    error: null,
    debug,
  });

  const scriptLoadedRef = useRef(false);

  const log = (...args: any[]) => {
    if (debug) {
      console.log('[useHashConnect]', ...args);
    }
  };

  const logError = (...args: any[]) => {
    if (debug) {
      console.error('[useHashConnect]', ...args);
    }
  };

  useEffect(() => {
    log('Hook mounted, initializing...');
    
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
        setState((prev) => ({
          ...prev,
          isConnected: true,
          userAddress: user,
          isLoading: false,
          error: null,
        }));
      } else if (eventType === "disconnected") {
        log('🔌 Disconnected event received, clearing state...');
        setState((prev) => ({
          ...prev,
          isConnected: false,
          userAddress: null,
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
          setState((prev) => ({
            ...prev,
            isConnected: true,
            userAddress: user.address,
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
  }, [debug]);

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

    try {
      log('Calling window.HASHConnect.connect()...');
      await window.HASHConnect.connect();
      log('✅ Connect call completed');
    } catch (error) {
      logError('❌ Error during connect:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [debug]);

  const disconnect = useCallback(() => {
    log('🔌 Disconnect method called');
    
    // For React users, we need to:
    // 1. Clear storage (UserAgent will detect this on next connect and reset its state)
    // 2. Dispatch the event to update React state
    try {
      log('Cleaning up connection state...');
      
      // Check if vanilla JS disconnect button exists
      const disconnectBtn = document.getElementById("hash-connect-disconnect-btn");
      if (disconnectBtn) {
        log('Found vanilla JS disconnect button, using it...');
        disconnectBtn.click();
      } else {
        log('No vanilla JS button, manually cleaning up...');
        
        // Clear storage
        localStorage.removeItem('hc:sessionId');
        localStorage.removeItem('hc:address');
        localStorage.removeItem('hc:accessToken');
        localStorage.removeItem('hc:refreshToken');
        localStorage.removeItem('hc:signature');
        
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
  }, [debug, log, logError]);

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
    makeAuthRequest,
  };
}

