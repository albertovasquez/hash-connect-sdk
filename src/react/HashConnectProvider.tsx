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
}

export const HashConnectProvider: React.FC<HashConnectProviderProps> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load SDK script
    const existingScript = document.querySelector('script[src*="hash-connect"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@hashpass/connect/dist/hash-connect.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const handleHashConnectEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { eventType, user } = customEvent.detail;

      if (eventType === "connected") {
        setIsConnected(true);
        setUserAddress(user);
        setIsLoading(false);
      } else if (eventType === "disconnected") {
        setIsConnected(false);
        setUserAddress(null);
        setIsLoading(false);
      }
    };

    document.addEventListener("hash-connect-event", handleHashConnectEvent);

    return () => {
      document.removeEventListener("hash-connect-event", handleHashConnectEvent);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.HASHConnect) {
      console.error("HashConnect SDK not loaded");
      return;
    }
    setIsLoading(true);
    await window.HASHConnect.connect();
  }, []);

  const disconnect = useCallback(() => {
    document.getElementById("hash-connect-disconnect-btn")?.click();
  }, []);

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

