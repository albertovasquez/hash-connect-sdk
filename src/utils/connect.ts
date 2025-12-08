import handleHashConnect from "../eventListeners/handleHashConnect";
import handleHashDisconnect from "../eventListeners/handleHashDisconnect";
import setupUserSubscription from "../eventListeners/setupUserSubscription";
import { storage } from "./storage";
import { PusherClient, ConnectionState } from "../types/pusher";

// Track if monitoring is already active to prevent duplicate listeners
let isMonitoringActive = false;
import { UserProfile } from "../types/user";
import { log, logError, logWarn } from "../config";
import { updateConnectionStatus } from "./modal";

// Reconnection configuration
const RECONNECT_CONFIG = {
    maxAttempts: 5, // Increased from 3 for better desktop network resilience
    baseDelay: 2000, // 2 seconds
    maxDelay: 30000, // 30 seconds
};

let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isManualDisconnect = false;
let eventsAreBound = false; // Track if events are bound to prevent duplicates

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
 * Bind or re-bind channel events
 * Ensures events are properly bound after reconnection
 */
function bindChannelEvents(
    channel: any,
    pusherClient: PusherClient,
    setProfile: (address: string, signature: string, accessToken: string, refreshToken: string) => void,
    getProfile: () => UserProfile,
    setToken: (accessToken: string, refreshToken: string) => void,
    onDisconnect: () => void,
    channelName: string,
    isRebind: boolean = false
) {
    // Only unbind if this is a re-bind operation (not initial binding)
    if (isRebind) {
        log('[Pusher] Unbinding existing events before re-binding...');
        // Unbind first to prevent duplicates
        channel.unbind("client-send-authorization-to-site");
        channel.unbind("client-send-unauthorization-to-site");
        channel.unbind("client-hash-pass-connect");
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
    
    eventsAreBound = true;
    log('[Pusher] ✅ All events bound successfully');
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

        // Prevent duplicate listener bindings if monitoring already active
        if (isMonitoringActive) {
            log('[Pusher] Connection monitoring already active, skipping duplicate setup');
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
                    
                    // Re-bind events after reconnection to ensure they still work
                    if (eventsAreBound) {
                        log('[Pusher] Re-binding events after reconnection...');
                        const channel = pusherClient.channel(channelName);
                        if (channel) {
                            bindChannelEvents(
                                channel,
                                pusherClient,
                                connectParams.setProfile,
                                connectParams.getProfile,
                                connectParams.setToken,
                                connectParams.onDisconnect,
                                channelName,
                                true // isRebind = true for reconnection
                            );
                        } else {
                            logWarn('[Pusher] Channel not found for event re-binding');
                        }
                    }
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

        // Mark monitoring as active to prevent duplicate listeners
        isMonitoringActive = true;
        log('[Pusher] ✅ Connection monitoring active');

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

export default async function connect({
    openModal,
    pusherClient,
    channelName,
    setProfile,
    getProfile,
    setToken,
    onDisconnect,
    isExpired,
    getNewTokens,
}: {
    openModal: () => void;
    pusherClient: PusherClient;
    channelName: string | null;
    setProfile: (address: string, signature: string, accessToken: string, refreshToken: string) => void;
    getProfile: () => UserProfile;
    setToken: (accessToken: string, refreshToken: string) => void;
    onDisconnect: () => void;
    isExpired?: (token: string) => boolean;
    getNewTokens?: () => Promise<{ accessToken: string; refreshToken: string }>;
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
            log("[HashConnect] Stored credentials found, checking token validity...");
            
            // Check if token validation is available
            if (!isExpired) {
                logWarn("[HashConnect] ⚠️ Token validation not available - proceeding with auto-reconnect without validation");
                logWarn("[HashConnect] 💡 This may result in using expired tokens. Consider providing isExpired function.");
                // Continue with auto-reconnect but without validation
            } else if (isExpired(profile.accessToken)) {
                // Token is expired - attempt refresh
                log("[HashConnect] ⚠️ Stored token expired, attempting refresh...");
                
                if (getNewTokens && profile.refreshToken) {
                    try {
                        log("[HashConnect] 🔄 Refreshing token before auto-reconnect...");
                        const newTokens = await getNewTokens();
                        
                        // Update profile with new tokens
                        profile.accessToken = newTokens.accessToken;
                        profile.refreshToken = newTokens.refreshToken;
                        setToken(newTokens.accessToken, newTokens.refreshToken);
                        
                        // Update storage
                        storage.setItem("hc:accessToken", newTokens.accessToken);
                        storage.setItem("hc:refreshToken", newTokens.refreshToken);
                        
                        log("[HashConnect] ✅ Token refreshed successfully, proceeding with auto-reconnect");
                    } catch (error) {
                        logError("[HashConnect] ❌ Token refresh failed during auto-reconnect:", error);
                        log("[HashConnect] Clearing expired credentials and starting fresh...");
                        
                        // Clear expired session
                        storage.clear();
                        
                        // Start fresh connection flow
                        log("[HashConnect] No stored credentials, starting new connection flow...");
                        storage.removeItem("hc:sessionId");
                        openModal();
                        return;
                    }
                } else {
                    logWarn("[HashConnect] ⚠️ Token expired but refresh not available, clearing session...");
                    storage.clear();
                    storage.removeItem("hc:sessionId");
                    openModal();
                    return;
                }
            } else {
                log("[HashConnect] ✅ Token is valid, proceeding with auto-reconnect");
            }
            
            log("[HashConnect] Auto-reconnecting with valid credentials...");
            
            // Bind events before triggering auto-reconnect
            bindChannelEvents(channel, pusherClient, setProfile, getProfile, setToken, onDisconnect, channelName, false);
            
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

        // Bind all channel events for new connections
        bindChannelEvents(channel, pusherClient, setProfile, getProfile, setToken, onDisconnect, channelName, false);
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
        eventsAreBound = false; // Reset events bound flag for next connection
        isMonitoringActive = false; // Reset monitoring flag for next connection
        
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
