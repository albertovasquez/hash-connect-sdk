import handleHashConnect from "../eventListeners/handleHashConnect";
import handleHashDisconnect from "../eventListeners/handleHashDisconnect";
import setupUserSubscription from "../eventListeners/setupUserSubscription";
import { storage } from "./storage";
import { PusherClient } from "../types/pusher";
import { UserProfile } from "../types/user";

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
            console.error("Invalid pusher client provided");
            return;
        }

        if (!channelName) {
            console.error("No channel name provided");
            return;
        }

        console.log(`[Pusher] Subscribing to channel: ${channelName}`);
        let channel = pusherClient.subscribe(channelName);
        console.log(`[Pusher] Successfully subscribed to channel: ${channelName}`);
        
        const btn = document.getElementById("hash-connect-btn");
        if (btn) {
            btn.setAttribute("disabled", "true");
        }

        const storedAddress = storage.getItem("hc:address");
        const storedToken = storage.getItem("hc:accessToken");
        const profile = getProfile();

        if (storedAddress != null && storedToken != null && profile.address && profile.accessToken) {
            console.log("[HashConnect] Auto-reconnecting with stored credentials...");
            openModal();
            handleHashConnect(
                {
                    address: profile.address,
                    accessToken: profile.accessToken,
                    refreshToken: profile.refreshToken || '',
                },
                setToken,
                onDisconnect
            );
            return;
        } else {
            console.log("[HashConnect] No stored credentials, starting new connection flow...");
            storage.removeItem("hc:sessionId");
            openModal();
        }

        console.log(`[Pusher] Binding to event: client-send-authorization-to-site`);
        channel.bind(
            "client-send-authorization-to-site",
            (data: {
                address: string;
                accessToken: string;
                refreshToken: string;
            }) => {
                try {
                    console.log(`[Pusher] ✅ Received: client-send-authorization-to-site`, {
                        address: data.address,
                        hasAccessToken: !!data.accessToken,
                        hasRefreshToken: !!data.refreshToken
                    });
                    handleHashConnect(data, setToken, onDisconnect);
                } catch (error) {
                    console.error("[Pusher] Error handling authorization:", error);
                }
            }
        );

        console.log(`[Pusher] Binding to event: client-send-unauthorization-to-site`);
        channel.bind(
            "client-send-unauthorization-to-site",
            (data: { address: string }) => {
                try {
                    console.log(`[Pusher] ✅ Received: client-send-unauthorization-to-site`, {
                        address: data.address
                    });
                    handleHashDisconnect(data, onDisconnect);
                } catch (error) {
                    console.error("[Pusher] Error handling unauthorization:", error);
                }
            }
        );

        console.log(`[Pusher] Binding to event: client-hash-pass-connect`);
        channel.bind(
            "client-hash-pass-connect",
            (data: { address: string; signature: string }) => {
                try {
                    console.log(`[Pusher] ✅ Received: client-hash-pass-connect`, {
                        address: data.address,
                        hasSignature: !!data.signature
                    });
                    
                    // Check if we're already fully connected with tokens
                    const profile = getProfile();
                    const hasAccessToken = storage.getItem("hc:accessToken");
                    const hasRefreshToken = storage.getItem("hc:refreshToken");
                    
                    if (hasAccessToken && hasRefreshToken && profile.address === data.address) {
                        console.log(`[Pusher] ⏭️  Already connected to this address, skipping subscription setup`);
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
                    console.error("[Pusher] Error setting up user subscription:", error);
                }
            }
        );
    } catch (ex) {
        console.error("Error connecting to HASH Pass:", ex);
    }
}
