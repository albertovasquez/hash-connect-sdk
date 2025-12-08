/**
 * React Context Provider for HashConnect SDK
 * 
 * Usage:
 * import { HashConnectProvider, useHashConnectContext } from '@hashpass/connect/react';
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { CONFIG } from "../config";

interface HashConnectContextType {
  isConnected: boolean;
  userAddress: string | null;
  clubId: string | null;
  clubName: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  getClubId: () => string | null;
  getClubName: () => string | null;
  isLoading: boolean;
}

const HashConnectContext = createContext<HashConnectContextType | undefined>(
  undefined
);

export interface HashConnectProviderProps {
  children: React.ReactNode;
  debug?: boolean;
  disclaimer?: string;
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

export const HashConnectProvider: React.FC<HashConnectProviderProps> = ({
  children,
  debug = false,
  disclaimer,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize log functions to prevent unnecessary callback recreations
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[HashConnectProvider]', ...args);
    }
  }, [debug]);

  const logError = useCallback((...args: any[]) => {
    if (debug) {
      console.error('[HashConnectProvider]', ...args);
    }
  }, [debug]);

  useEffect(() => {
    log('Provider mounted, initializing...');
    
    // Set debug mode in SDK config
    CONFIG.DEBUG = debug;
    
    // Set custom disclaimer if provided
    if (disclaimer) {
      CONFIG.CUSTOM_DISCLAIMER = disclaimer;
      log('Custom disclaimer set');
    }
    
    log('HASHConnect available:', !!window.HASHConnect);
    
    if (window.HASHConnect) {
      log('HASHConnect methods:', Object.keys(window.HASHConnect));
    } else {
      logError('❌ HASHConnect SDK not initialized. Make sure you imported from @hashpass/connect/react');
    }

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
        setIsConnected(true);
        setUserAddress(user);
        setClubId(storedClubId);
        setClubName(storedClubName);
        setIsLoading(false);
        log('State updated:', { isConnected: true, userAddress: user, clubId: storedClubId, clubName: storedClubName, isLoading: false });
      } else if (eventType === "disconnected") {
        log('🔌 Disconnected event received, clearing state...');
        setIsConnected(false);
        setUserAddress(null);
        setClubId(null);
        setClubName(null);
        setIsLoading(false);
        log('State updated:', { isConnected: false, userAddress: null, clubId: null, clubName: null, isLoading: false });
      }
    };

    document.addEventListener("hash-connect-event", handleHashConnectEvent);
    log('✅ Event listener attached for hash-connect-event');

    return () => {
      log('Provider unmounting, cleaning up...');
      document.removeEventListener("hash-connect-event", handleHashConnectEvent);
    };
  }, [debug, disclaimer, log, logError]);

  const connect = useCallback(async () => {
    log('🔗 Connect method called');
    log('Checking if HASHConnect is available...');
    
    if (!window.HASHConnect) {
      const errorMsg = "HashConnect SDK not loaded";
      logError('❌', errorMsg);
      console.error(errorMsg);
      return;
    }
    
    log('✅ HASHConnect SDK is available');
    log('HASHConnect object:', window.HASHConnect);
    log('Setting loading state to true...');
    setIsLoading(true);
    
    // Add timeout to prevent stuck loading state
    const loadingTimeout = setTimeout(() => {
      log('⏱️ Connection timeout after 30 seconds');
      // Use functional setState to check current state (not stale closure value)
      setIsLoading((currentLoading) => {
        if (currentLoading) {
          logError('❌ Loading state stuck, resetting with timeout');
          return false;
        }
        return currentLoading;
      });
    }, 30000); // 30 second timeout
    
    try {
      log('Calling window.HASHConnect.connect()...');
      await window.HASHConnect.connect();
      clearTimeout(loadingTimeout); // Clear timeout on successful connect
      log('✅ Connect call completed');
      // Explicitly clear loading state on success, don't rely solely on event
      setIsLoading(false);
    } catch (error) {
      clearTimeout(loadingTimeout); // Clear timeout on error
      logError('❌ Error during connect:', error);
      setIsLoading(false);
    }
  }, [log, logError]);

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
    return window.HASHConnect?.getToken() || null;
  }, []);

  const getClubId = useCallback(() => {
    return window.HASHConnect?.getClubId() || null;
  }, []);

  const getClubName = useCallback(() => {
    return window.HASHConnect?.getClubName() || null;
  }, []);

  return (
    <HashConnectContext.Provider
      value={{
        isConnected,
        userAddress,
        clubId,
        clubName,
        connect,
        disconnect,
        getToken,
        getClubId,
        getClubName,
        isLoading,
      }}
    >
      {children}
    </HashConnectContext.Provider>
  );
};

export const useHashConnectContext = () => {
  const context = useContext(HashConnectContext);
  if (!context) {
    throw new Error("useHashConnectContext must be used within HashConnectProvider");
  }
  return context;
};

