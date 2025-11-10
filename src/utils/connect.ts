import handleHashConnect from "../eventListeners/handleHashConnect";
import handleHashDisconnect from "../eventListeners/handleHashDisconnect";
import setupUserSubscription from "../eventListeners/setupUserSubscription";
import { storage } from "./storage";
import { PusherClient } from "../types/pusher";
import { UserProfile } from "../types/user";
import { log, logError } from "../config";

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
        if (!pusherClient || typeof pusherClient.subscribe !== 'function') {
            logError("Invalid pusher client provided");
            return;
        }

        if (!channelName) {
            logError("No channel name provided");
            return;
        }

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
                    clubId: profile.clubId || ''
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
    }
}
