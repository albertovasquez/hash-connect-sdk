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
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  getClubId: () => string | null;
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

export const HashConnectProvider: React.FC<HashConnectProviderProps> = ({
  children,
  debug = false,
  disclaimer,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
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
        
        // Get clubId from localStorage
        const storedClubId = localStorage.getItem('hc:clubId');
        
        setIsConnected(true);
        setUserAddress(user);
        setClubId(storedClubId);
        setIsLoading(false);
        log('State updated:', { isConnected: true, userAddress: user, clubId: storedClubId, isLoading: false });
      } else if (eventType === "disconnected") {
        log('🔌 Disconnected event received, clearing state...');
        setIsConnected(false);
        setUserAddress(null);
        setClubId(null);
        setIsLoading(false);
        log('State updated:', { isConnected: false, userAddress: null, clubId: null, isLoading: false });
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
    
    // For React users, we need to:
    // 1. Call the UserAgent's internal disconnect to reset its state
    // 2. Then dispatch the event to update React state
    try {
      log('Cleaning up connection state...');
      
      // First, trigger the SDK's internal disconnect (which calls onDisconnect in UserAgent)
      if (window.HASHConnect) {
        // The SDK doesn't expose a disconnect method directly, so we need to:
        // - Clear storage (which onDisconnect does)
        // - Manually reset the internal state by calling the disconnect button handler OR
        // - Just clear everything and dispatch the event
        
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
          localStorage.removeItem('hc:clubId');
          
          // Dispatch disconnected event
          const event = new CustomEvent('hash-connect-event', {
            detail: {
              eventType: 'disconnected',
              user: null
            }
          });
          document.dispatchEvent(event);
        }
      }
      
      log('✅ Disconnected successfully');
    } catch (error) {
      logError('❌ Error during disconnect:', error);
    }
  }, [debug, log, logError]);

  const getToken = useCallback(async () => {
    return window.HASHConnect?.getToken() || null;
  }, []);

  const getClubId = useCallback(() => {
    return window.HASHConnect?.getClubId() || null;
  }, []);

  return (
    <HashConnectContext.Provider
      value={{
        isConnected,
        userAddress,
        clubId,
        connect,
        disconnect,
        getToken,
        getClubId,
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

