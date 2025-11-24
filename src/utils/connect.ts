import handleHashConnect from "../eventListeners/handleHashConnect";
import handleHashDisconnect from "../eventListeners/handleHashDisconnect";
import setupUserSubscription from "../eventListeners/setupUserSubscription";
import { storage } from "./storage";
import { PusherClient, ConnectionState } from "../types/pusher";
import { UserProfile } from "../types/user";
import { log, logError, logWarn } from "../config";
import { updateConnectionStatus } from "./modal";

// Reconnection configuration
const RECONNECT_CONFIG = {
    maxAttempts: 3,
    baseDelay: 2000, // 2 seconds
    maxDelay: 30000, // 30 seconds
};

let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isManualDisconnect = false;

/**
 * Calculate exponential backoff delay for reconnection attempts
 */
function getReconnectDelay(attempt: number): number {
    const delay = Math.min(
        RECONNECT_CONFIG.baseDelay * Math.pow(2, attempt),
        RECONNECT_CONFIG.maxDelay
    );
    log(`[Reconnect] Calculated delay for attempt ${attempt + 1}: ${delay}ms`);
    return delay;
}

/**
 * Clear any pending reconnection timeout
 */
function clearReconnectTimeout() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
        log('[Reconnect] Cleared reconnection timeout');
    }
}

/**
 * Monitor Pusher connection state and handle reconnections
 */
function monitorPusherConnection(
    pusherClient: PusherClient,
    channelName: string,
    connectParams: {
        openModal: () => void;
        setProfile: (address: string, signature: string, accessToken: string, refreshToken: string) => void;
        getProfile: () => UserProfile;
        setToken: (accessToken: string, refreshToken: string) => void;
        onDisconnect: () => void;
    }
) {
    try {
        if (!pusherClient.connection) {
            logWarn('[Pusher] Connection object not available, skipping monitoring');
            return;
        }

        log('[Pusher] Setting up connection state monitoring...');

        // Listen to all connection state changes
        pusherClient.connection.bind('state_change', (states: { previous: ConnectionState; current: ConnectionState }) => {
            log(`[Pusher] Connection state changed: ${states.previous} -> ${states.current}`);
            
            switch (states.current) {
                case 'connected':
                    updateConnectionStatus('connected');
                    reconnectAttempts = 0; // Reset on successful connection
                    clearReconnectTimeout();
                    log('[Pusher] ✅ Successfully connected to Pusher');
                    break;
                
                case 'connecting':
                    updateConnectionStatus('connecting');
                    log('[Pusher] 🔄 Connecting to Pusher...');
                    break;
                
                case 'unavailable':
                    updateConnectionStatus('reconnecting');
                    logWarn('[Pusher] ⚠️ Connection unavailable, Pusher will attempt to reconnect automatically');
                    break;
                
                case 'failed':
                    updateConnectionStatus('failed');
                    logError('[Pusher] ❌ Connection failed');
                    handleConnectionFailure(pusherClient, channelName, connectParams);
                    break;
                
                case 'disconnected':
                    if (!isManualDisconnect) {
                        updateConnectionStatus('disconnected');
                        logWarn('[Pusher] ⚠️ Disconnected from Pusher');
                        handleConnectionFailure(pusherClient, channelName, connectParams);
                    }
                    break;
            }
        });

        // Set initial status
        const currentState = pusherClient.connection.state as ConnectionState;
        log(`[Pusher] Initial connection state: ${currentState}`);
        
        if (currentState === 'connected') {
            updateConnectionStatus('connected');
        } else if (currentState === 'connecting' || currentState === 'initialized') {
            updateConnectionStatus('connecting');
        }

    } catch (error) {
        logError('[Pusher] Error setting up connection monitoring:', error);
    }
}

/**
 * Handle connection failures with exponential backoff reconnection
 */
function handleConnectionFailure(
    pusherClient: PusherClient,
    channelName: string,
    connectParams: any
) {
    if (isManualDisconnect) {
        log('[Reconnect] Skipping reconnection (manual disconnect)');
        return;
    }

    if (reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
        logError(`[Reconnect] ❌ Max reconnection attempts (${RECONNECT_CONFIG.maxAttempts}) reached`);
        updateConnectionStatus('failed');
        return;
    }

    reconnectAttempts++;
    const delay = getReconnectDelay(reconnectAttempts - 1);
    
    log(`[Reconnect] Attempting reconnection ${reconnectAttempts}/${RECONNECT_CONFIG.maxAttempts} in ${delay}ms`);
    updateConnectionStatus('reconnecting');

    clearReconnectTimeout();
    
    reconnectTimeout = setTimeout(() => {
        try {
            log(`[Reconnect] Executing reconnection attempt ${reconnectAttempts}`);
            
            // Try to reconnect by re-subscribing to the channel
            const channel = pusherClient.subscribe(channelName);
            log('[Reconnect] Re-subscribed to channel');
            
            // Re-bind events (the original connect function handles this)
            // For now, we just log that we've reconnected
            // The state_change event will update the UI when connection succeeds
            
        } catch (error) {
            logError('[Reconnect] Error during reconnection attempt:', error);
            // Will be handled by the next state change event
        }
    }, delay);
}

export default function connect({
    openModal,
    pusherClient,
    channelName,
    setProfile,
    getProfile,
    setToken,
    onDisconnect,
}: {
    openModal: () => void;
    pusherClient: PusherClient;
    channelName: string | null;
    setProfile: (address: string, signature: string, accessToken: string, refreshToken: string) => void;
    getProfile: () => UserProfile;
    setToken: (accessToken: string, refreshToken: string) => void;
    onDisconnect: () => void;
}) {
    try {
        // Reset manual disconnect flag
        isManualDisconnect = false;
        
        if (!pusherClient || typeof pusherClient.subscribe !== 'function') {
            logError("Invalid pusher client provided");
            updateConnectionStatus('failed');
            return;
        }

        if (!channelName) {
            logError("No channel name provided");
            updateConnectionStatus('failed');
            return;
        }

        // Set up connection monitoring
        monitorPusherConnection(pusherClient, channelName, {
            openModal,
            setProfile,
            getProfile,
            setToken,
            onDisconnect
        });

        log(`[Pusher] Subscribing to channel: ${channelName}`);
        let channel = pusherClient.subscribe(channelName);
        log(`[Pusher] Successfully subscribed to channel: ${channelName}`);
        
        const btn = document.getElementById("hash-connect-btn");
        if (btn) {
            btn.setAttribute("disabled", "true");
        }

        const storedAddress = storage.getItem("hc:address");
        const storedToken = storage.getItem("hc:accessToken");
        const profile = getProfile();

        if (storedAddress != null && storedToken != null && profile.address && profile.accessToken) {
            log("[HashConnect] Auto-reconnecting with stored credentials...");
            openModal();
            handleHashConnect(
                {
                    address: profile.address,
                    accessToken: profile.accessToken,
                    refreshToken: profile.refreshToken || '',
                    clubId: profile.clubId || '',
                    clubName: profile.clubName || ''
                },
                setToken,
                onDisconnect
            );
            return;
        } else {
            log("[HashConnect] No stored credentials, starting new connection flow...");
            storage.removeItem("hc:sessionId");
            openModal();
        }

        log(`[Pusher] Binding to event: client-send-authorization-to-site`);
        channel.bind(
            "client-send-authorization-to-site",
            (data: {
                address: string;
                accessToken: string;
                refreshToken: string;
                clubId: string;
                clubName: string;
            }) => {
                try {
                    log(`[Pusher] ✅ Received: client-send-authorization-to-site`, {
                        address: data.address,
                        hasAccessToken: !!data.accessToken,
                        hasRefreshToken: !!data.refreshToken
                    });
                    
                    log('[Pusher] Calling handleHashConnect...');
                    handleHashConnect(data, setToken, onDisconnect);
                    log('[Pusher] ✅ handleHashConnect completed');
                } catch (error) {
                    logError("[Pusher] Error handling authorization:", error);
                }
            }
        );

        log(`[Pusher] Binding to event: client-send-unauthorization-to-site`);
        channel.bind(
            "client-send-unauthorization-to-site",
            (data: { address: string }) => {
                try {
                    log(`[Pusher] ✅ Received: client-send-unauthorization-to-site`, {
                        address: data.address
                    });
                    handleHashDisconnect(data, onDisconnect);
                } catch (error) {
                    logError("[Pusher] Error handling unauthorization:", error);
                }
            }
        );

        log(`[Pusher] Binding to event: client-hash-pass-connect`);
        channel.bind(
            "client-hash-pass-connect",
            (data: { address: string; signature: string }) => {
                try {
                    log(`[Pusher] ✅ Received: client-hash-pass-connect`, {
                        address: data.address,
                        hasSignature: !!data.signature
                    });
                    
                    // Check if we're already fully connected with tokens
                    const profile = getProfile();
                    const hasAccessToken = storage.getItem("hc:accessToken");
                    const hasRefreshToken = storage.getItem("hc:refreshToken");
                    
                    if (hasAccessToken && hasRefreshToken && profile.address === data.address) {
                        log(`[Pusher] ⏭️  Already connected to this address, skipping subscription setup`);
                        return;
                    }
                    
                    setupUserSubscription(
                        data,
                        pusherClient,
                        setProfile,
                        profile,
                        channelName
                    );
                } catch (error) {
                    logError("[Pusher] Error setting up user subscription:", error);
                }
            }
        );
    } catch (ex) {
        logError("Error connecting to HASH Pass:", ex);
        updateConnectionStatus('failed');
    }
}

/**
 * Disconnect from Pusher and cleanup
 */
export function disconnect(pusherClient: PusherClient | null) {
    try {
        isManualDisconnect = true;
        clearReconnectTimeout();
        reconnectAttempts = 0;
        
        if (pusherClient) {
            log('[Pusher] Manually disconnecting...');
            pusherClient.disconnect();
        }
        
        updateConnectionStatus('disconnected');
        log('[Pusher] ✅ Disconnected successfully');
    } catch (error) {
        logError('[Pusher] Error during disconnect:', error);
    }
}
