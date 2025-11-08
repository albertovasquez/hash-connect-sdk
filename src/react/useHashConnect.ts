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

export function useHashConnect(): UseHashConnectReturn {
  const [state, setState] = useState<HashConnectState>({
    isConnected: false,
    isLoading: false,
    userAddress: null,
    error: null,
  });

  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load SDK script only once
    if (!scriptLoadedRef.current) {
      const existingScript = document.querySelector('script[src*="hash-connect"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/@hashpass/connect/dist/hash-connect.js";
        script.async = true;
        document.body.appendChild(script);
      }
      scriptLoadedRef.current = true;
    }

    // Listen for connection events
    const handleHashConnectEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { eventType, user } = customEvent.detail;

      if (eventType === "connected") {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          userAddress: user,
          isLoading: false,
          error: null,
        }));
      } else if (eventType === "disconnected") {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          userAddress: null,
          isLoading: false,
        }));
      }
    };

    document.addEventListener("hash-connect-event", handleHashConnectEvent);

    // Check if already connected
    const checkConnection = setInterval(() => {
      if (window.HASHConnect?.isReady()) {
        const user = window.HASHConnect.getUser();
        if (user?.address) {
          setState((prev) => ({
            ...prev,
            isConnected: true,
            userAddress: user.address,
          }));
        }
        clearInterval(checkConnection);
      }
    }, 100);

    return () => {
      document.removeEventListener("hash-connect-event", handleHashConnectEvent);
      clearInterval(checkConnection);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.HASHConnect) {
      setState((prev) => ({
        ...prev,
        error: "HashConnect SDK not loaded",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await window.HASHConnect.connect();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    const disconnectBtn = document.getElementById("hash-connect-disconnect-btn");
    if (disconnectBtn) {
      disconnectBtn.click();
    }
  }, []);

  const getToken = useCallback(async () => {
    if (!window.HASHConnect) return null;
    return await window.HASHConnect.getToken();
  }, []);

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

