/**
 * React Context Provider for HashConnect SDK
 * 
 * Usage:
 * import { HashConnectProvider, useHashConnectContext } from '@hashpass/connect/react';
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface HashConnectContextType {
  isConnected: boolean;
  userAddress: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  isLoading: boolean;
}

const HashConnectContext = createContext<HashConnectContextType | undefined>(
  undefined
);

export interface HashConnectProviderProps {
  children: React.ReactNode;
  debug?: boolean;
}

export const HashConnectProvider: React.FC<HashConnectProviderProps> = ({
  children,
  debug = false,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const log = (...args: any[]) => {
    if (debug) {
      console.log('[HashConnectProvider]', ...args);
    }
  };

  const logError = (...args: any[]) => {
    if (debug) {
      console.error('[HashConnectProvider]', ...args);
    }
  };

  useEffect(() => {
    log('Provider mounted, initializing...');
    
    // Load SDK script
    const existingScript = document.querySelector('script[src*="hash-connect"]');
    if (!existingScript) {
      log('SDK script not found, loading from CDN...');
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@hashpass/connect/dist/hash-connect.js";
      script.async = true;
      
      script.onload = () => {
        log('✅ SDK script loaded successfully');
        log('HASHConnect available:', !!window.HASHConnect);
        if (window.HASHConnect) {
          log('HASHConnect methods:', Object.keys(window.HASHConnect));
        }
      };
      
      script.onerror = (error) => {
        logError('❌ Failed to load SDK script:', error);
      };
      
      document.body.appendChild(script);
    } else {
      log('SDK script already exists in DOM');
      log('HASHConnect available:', !!window.HASHConnect);
    }

    const handleHashConnectEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { eventType, user } = customEvent.detail;
      
      log('📨 Received hash-connect-event:', { eventType, user });

      if (eventType === "connected") {
        log('✅ Connected event received, updating state...');
        setIsConnected(true);
        setUserAddress(user);
        setIsLoading(false);
      } else if (eventType === "disconnected") {
        log('🔌 Disconnected event received, clearing state...');
        setIsConnected(false);
        setUserAddress(null);
        setIsLoading(false);
      }
    };

    document.addEventListener("hash-connect-event", handleHashConnectEvent);
    log('✅ Event listener attached for hash-connect-event');

    return () => {
      log('Provider unmounting, cleaning up...');
      document.removeEventListener("hash-connect-event", handleHashConnectEvent);
    };
  }, [debug]);

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
    
    try {
      log('Calling window.HASHConnect.connect()...');
      await window.HASHConnect.connect();
      log('✅ Connect call completed');
    } catch (error) {
      logError('❌ Error during connect:', error);
      setIsLoading(false);
    }
  }, [debug]);

  const disconnect = useCallback(() => {
    log('🔌 Disconnect method called');
    const disconnectBtn = document.getElementById("hash-connect-disconnect-btn");
    
    if (disconnectBtn) {
      log('✅ Found disconnect button, clicking it...');
      disconnectBtn.click();
    } else {
      logError('❌ Disconnect button not found in DOM');
    }
  }, [debug]);

  const getToken = useCallback(async () => {
    return window.HASHConnect?.getToken() || null;
  }, []);

  return (
    <HashConnectContext.Provider
      value={{
        isConnected,
        userAddress,
        connect,
        disconnect,
        getToken,
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

