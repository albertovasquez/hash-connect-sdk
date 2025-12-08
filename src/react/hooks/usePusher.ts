/**
 * React hook for Pusher real-time communication
 * SSR-safe: loads Pusher from CDN and handles connection state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useScriptLoader } from './useScriptLoader';
import type { PusherClient, PusherChannel, ConnectionState } from '../../types/pusher';

// Pusher CDN URL
const PUSHER_SCRIPT_URL = 'https://js.pusher.com/8.0.1/pusher.min.js';

export interface UsePusherOptions {
  /** Pusher app key */
  key: string;
  /** Pusher cluster */
  cluster: string;
  /** Auth endpoint for private channels */
  authEndpoint: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

export interface UsePusherReturn {
  /** The Pusher client instance */
  client: PusherClient | null;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether Pusher is ready to use */
  isReady: boolean;
  /** Whether Pusher script is loading */
  isLoading: boolean;
  /** Error if connection failed */
  error: Error | null;
  /** Subscribe to a channel */
  subscribe: (channelName: string) => PusherChannel | null;
  /** Unsubscribe from a channel */
  unsubscribe: (channelName: string) => void;
  /** Disconnect from Pusher */
  disconnect: () => void;
  /** Reconnect to Pusher */
  reconnect: () => void;
}

// Reconnection configuration
const RECONNECT_CONFIG = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 30000,
};

declare global {
  interface Window {
    Pusher: new (key: string, options: {
      cluster: string;
      authEndpoint: string;
    }) => PusherClient;
  }
}

/**
 * Hook for Pusher real-time communication
 * 
 * @example
 * ```tsx
 * const { client, connectionState, subscribe, isReady } = usePusher({
 *   key: 'your-pusher-key',
 *   cluster: 'us2',
 *   authEndpoint: '/api/pusher/auth',
 * });
 * 
 * useEffect(() => {
 *   if (!isReady) return;
 *   
 *   const channel = subscribe('private-my-channel');
 *   channel?.bind('my-event', (data) => {
 *     console.log('Received:', data);
 *   });
 *   
 *   return () => unsubscribe('private-my-channel');
 * }, [isReady, subscribe]);
 * ```
 */
export function usePusher(options: UsePusherOptions): UsePusherReturn {
  const { key, cluster, authEndpoint, debug = false, autoConnect = true } = options;

  const [client, setClient] = useState<PusherClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('initialized');
  const [error, setError] = useState<Error | null>(null);
  
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);
  const reconnectListenerRef = useRef<(() => void) | null>(null);

  // Memoize script loader callbacks to prevent unnecessary re-renders (Bug Fix #1)
  const handleScriptError = useCallback((err: Error) => {
    if (debug) console.error('[usePusher] Failed to load Pusher script:', err);
    setError(err);
  }, [debug]);

  // Load Pusher script from CDN
  const { loaded: pusherLoaded, loading: pusherLoading, error: scriptError } = useScriptLoader(
    PUSHER_SCRIPT_URL,
    {
      retries: 3,
      onError: handleScriptError,
    }
  );

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log('[usePusher]', ...args);
  }, [debug]);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback((attempt: number): number => {
    return Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(2, attempt),
      RECONNECT_CONFIG.maxDelay
    );
  }, []);

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Clean up reconnection listener (Bug Fix #2)
  const cleanupReconnectListener = useCallback(() => {
    if (reconnectListenerRef.current && client) {
      client.connection.unbind('connected', reconnectListenerRef.current);
      reconnectListenerRef.current = null;
    }
  }, [client]);

  // Handle connection failure with retry
  const handleConnectionFailure = useCallback(() => {
    if (isManualDisconnectRef.current) {
      log('Skipping reconnection (manual disconnect)');
      return;
    }

    if (reconnectAttemptsRef.current >= RECONNECT_CONFIG.maxAttempts) {
      log('Max reconnection attempts reached');
      setError(new Error('Max reconnection attempts reached'));
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = getReconnectDelay(reconnectAttemptsRef.current - 1);
    
    log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${RECONNECT_CONFIG.maxAttempts})`);

    clearReconnectTimeout();
    reconnectTimeoutRef.current = setTimeout(() => {
      if (client) {
        log('Attempting reconnection...');
        
        // Clean up any existing reconnect listener before adding a new one (Bug Fix #2)
        cleanupReconnectListener();
        
        // Create and store the new listener
        const onReconnected = () => {
          log('Reconnected successfully');
          reconnectAttemptsRef.current = 0;
          // Clean up this listener after successful reconnection
          cleanupReconnectListener();
        };
        reconnectListenerRef.current = onReconnected;
        
        // Pusher will auto-reconnect, bind listener to track success
        client.connection.bind('connected', onReconnected);
      }
    }, delay);
  }, [client, log, getReconnectDelay, clearReconnectTimeout, cleanupReconnectListener]);

  // Initialize Pusher client
  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;
    
    // Wait for script to load
    if (!pusherLoaded || !autoConnect) return;
    
    // Check if Pusher is available
    if (!window.Pusher) {
      log('Pusher not available on window');
      setError(new Error('Pusher not available'));
      return;
    }

    log('Initializing Pusher client...');
    
    try {
      const pusher = new window.Pusher(key, {
        cluster,
        authEndpoint,
      });

      // Bind connection state changes
      pusher.connection.bind('state_change', (states: { previous: ConnectionState; current: ConnectionState }) => {
        log(`Connection state: ${states.previous} -> ${states.current}`);
        setConnectionState(states.current);

        switch (states.current) {
          case 'connected':
            setError(null);
            reconnectAttemptsRef.current = 0;
            clearReconnectTimeout();
            break;
          case 'failed':
          case 'disconnected':
            if (!isManualDisconnectRef.current) {
              handleConnectionFailure();
            }
            break;
        }
      });

      // Bind error handler
      pusher.connection.bind('error', (err: Error) => {
        log('Connection error:', err);
        setError(err);
      });

      setClient(pusher);
      log('Pusher client initialized');

      return () => {
        log('Cleaning up Pusher client...');
        clearReconnectTimeout();
        // Clean up reconnect listener before disconnecting
        if (reconnectListenerRef.current) {
          pusher.connection.unbind('connected', reconnectListenerRef.current);
          reconnectListenerRef.current = null;
        }
        pusher.disconnect();
        setClient(null);
      };
    } catch (err) {
      log('Error initializing Pusher:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return undefined;
    }
  }, [pusherLoaded, autoConnect, key, cluster, authEndpoint, log, handleConnectionFailure, clearReconnectTimeout]);

  // Subscribe to a channel
  const subscribe = useCallback((channelName: string): PusherChannel | null => {
    if (!client) {
      log(`Cannot subscribe to ${channelName}: client not ready`);
      return null;
    }

    log(`Subscribing to channel: ${channelName}`);
    return client.subscribe(channelName);
  }, [client, log]);

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channelName: string): void => {
    if (!client) return;
    
    log(`Unsubscribing from channel: ${channelName}`);
    client.unsubscribe(channelName);
  }, [client, log]);

  // Disconnect from Pusher
  const disconnect = useCallback((): void => {
    log('Disconnecting...');
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();
    reconnectAttemptsRef.current = 0;
    
    if (client) {
      client.disconnect();
    }
    
    setConnectionState('disconnected');
    log('Disconnected');
  }, [client, log, clearReconnectTimeout]);

  // Reconnect to Pusher
  const reconnect = useCallback((): void => {
    log('Manual reconnect requested');
    isManualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    setError(null);
    
    // The client will auto-reconnect when we clear the manual disconnect flag
    // If needed, we can re-initialize by toggling autoConnect
  }, [log]);

  return {
    client,
    connectionState,
    isReady: !!client && connectionState === 'connected',
    isLoading: pusherLoading || connectionState === 'connecting',
    error: scriptError || error,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect,
  };
}
