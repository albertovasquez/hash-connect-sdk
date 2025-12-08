/**
 * React hook for Pusher real-time communication
 * SSR-safe: loads Pusher from CDN and handles connection state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useScriptLoader } from './useScriptLoader';
import type { PusherClient, PusherChannel, ConnectionState } from '../../types/pusher';

// Pusher CDN URL
const PUSHER_SCRIPT_URL = 'https://js.pusher.com/8.0.1/pusher.min.js';

export interface LogEvent {
  message: string;
  timestamp: Date;
}

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
  /** Callback for log events (suppresses console output when provided) */
  onLog?: (event: LogEvent) => void;
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
  const { key, cluster, authEndpoint, debug = false, autoConnect = true, onLog } = options;

  const [client, setClient] = useState<PusherClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('initialized');
  const [error, setError] = useState<Error | null>(null);
  
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);
  const reconnectListenerRef = useRef<(() => void) | null>(null);
  
  // Use ref to access client in callbacks without causing dependency changes
  // This prevents infinite loops from client state changes triggering effect re-runs
  const clientRef = useRef<PusherClient | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  // Centralized logging that respects onLog callback
  const log = useCallback((...args: unknown[]) => {
    const message = args.map(arg => {
      // Handle Error objects specially to preserve message and stack
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
      }
      // Handle other objects
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      // Handle primitives
      return String(arg);
    }).join(' ');

    // If onLog callback is provided, use it (suppresses console output)
    if (onLog) {
      onLog({ message: `[usePusher] ${message}`, timestamp: new Date() });
      return;
    }

    // Otherwise, use console if debug is enabled
    if (debug) {
      console.log('[usePusher]', ...args);
    }
  }, [debug, onLog]);

  // Memoize script loader callback to prevent useScriptLoader from recreating loadScript
  const handleScriptError = useCallback((err: Error) => {
    const message = `Failed to load Pusher script: ${err.message}`;
    
    // Use onLog if provided
    if (onLog) {
      onLog({ message: `[usePusher] ${message}`, timestamp: new Date() });
    } else if (debug) {
      console.error('[usePusher]', message, err);
    }
    
    setError(err);
  }, [debug, onLog]);

  // Load Pusher script from CDN
  const { loaded: pusherLoaded, loading: pusherLoading, error: scriptError } = useScriptLoader(
    PUSHER_SCRIPT_URL,
    {
      retries: 3,
      onError: handleScriptError,
    }
  );

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

  // Clean up reconnection listener to prevent duplicate handlers
  // Uses clientRef to avoid dependency on client state
  const cleanupReconnectListener = useCallback(() => {
    if (reconnectListenerRef.current && clientRef.current) {
      clientRef.current.connection.unbind('connected', reconnectListenerRef.current);
      reconnectListenerRef.current = null;
    }
  }, []); // No dependencies - uses refs

  // Handle connection failure with retry
  // Uses clientRef to avoid dependency on client state, preventing infinite loops
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
      const currentClient = clientRef.current;
      if (currentClient) {
        log('Attempting reconnection...');
        
        // Clean up any existing reconnect listener before adding a new one
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
        currentClient.connection.bind('connected', onReconnected);
      }
    }, delay);
  }, [log, getReconnectDelay, clearReconnectTimeout, cleanupReconnectListener]); // client removed - uses clientRef

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

      // Create named handlers so we can unbind them in cleanup
      const handleStateChange = (states: { previous: ConnectionState; current: ConnectionState }) => {
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
      };

      const handleError = (err: Error) => {
        log('Connection error:', err);
        setError(err);
      };

      // Bind connection event handlers
      pusher.connection.bind('state_change', handleStateChange);
      pusher.connection.bind('error', handleError);

      setClient(pusher);
      log('Pusher client initialized');

      return () => {
        log('Cleaning up Pusher client...');
        clearReconnectTimeout();
        
        // Unbind all event listeners to prevent memory leaks
        pusher.connection.unbind('state_change', handleStateChange);
        pusher.connection.unbind('error', handleError);
        
        // Clean up reconnect listener if present
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
  // Uses clientRef to provide stable callback reference
  const subscribe = useCallback((channelName: string): PusherChannel | null => {
    const currentClient = clientRef.current;
    if (!currentClient) {
      log(`Cannot subscribe to ${channelName}: client not ready`);
      return null;
    }

    log(`Subscribing to channel: ${channelName}`);
    return currentClient.subscribe(channelName);
  }, [log]); // client removed - uses clientRef

  // Unsubscribe from a channel
  // Uses clientRef to provide stable callback reference
  const unsubscribe = useCallback((channelName: string): void => {
    const currentClient = clientRef.current;
    if (!currentClient) return;
    
    log(`Unsubscribing from channel: ${channelName}`);
    currentClient.unsubscribe(channelName);
  }, [log]); // client removed - uses clientRef

  // Disconnect from Pusher
  // Uses clientRef to provide stable callback reference
  const disconnect = useCallback((): void => {
    log('Disconnecting...');
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();
    reconnectAttemptsRef.current = 0;
    
    const currentClient = clientRef.current;
    if (currentClient) {
      currentClient.disconnect();
    }
    
    setConnectionState('disconnected');
    log('Disconnected');
  }, [log, clearReconnectTimeout]); // client removed - uses clientRef

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
