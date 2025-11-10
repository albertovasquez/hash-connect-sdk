import { storage } from "../utils/storage";
import { PusherClient, PusherChannel } from "../types/pusher";
import { UserProfile, ConnectionData } from "../types/user";
import { log, logError, logWarn } from "../config";

const onConnectToUserChannel = (
    userChannel: PusherChannel,
    userProfile: Pick<UserProfile, 'address' | 'signature'>,
    SessionChannelName: string
) => {
    try {
        // Check if we already have valid tokens (already authorized)
        const hasAccessToken = storage.getItem("hc:accessToken");
        const hasRefreshToken = storage.getItem("hc:refreshToken");
        
        if (hasAccessToken && hasRefreshToken) {
            log(`[Pusher] ⏭️  Already authorized, skipping authorization request`);
            return;
        }

        const siteName = document.getElementsByTagName("title");

        const triggerData = {
            signature: userProfile.signature,
            channel: SessionChannelName,
            domain: window.location.hostname, //device
            name: siteName.length ? siteName[0].innerText : "Unknown site",
            orgHash: null,
        };
        
        if (!userChannel || typeof userChannel.trigger !== 'function') {
            logError("[Pusher] Invalid user channel");
            return;
        }

        log(`[Pusher] 📤 Sending: client-request-user-to-authorize-from-site`, {
            channel: SessionChannelName,
            domain: triggerData.domain,
            siteName: triggerData.name
        });
        userChannel.trigger(
            "client-request-user-to-authorize-from-site",
            triggerData
        );
        log(`[Pusher] ✅ Message sent successfully`);
    } catch (error) {
        logError("Error in onConnectToUserChannel:", error);
    }
};

export default function setupUserSubscription(
    data: ConnectionData,
    pusherClient: PusherClient,
    setProfile: (address: string, signature: string, accessToken: string, refreshToken: string) => void,
    userProfile: Pick<UserProfile, 'address' | 'signature'>,
    SessionChannelName: string
) {
    try {
        // Validate input
        if (!data || !data.address || !data.signature) {
            logError("Invalid subscription data");
            return;
        }

        if (!pusherClient || typeof pusherClient.subscribe !== 'function') {
            logError("Invalid pusher client");
            return;
        }

        const userAddress = data.address;
        const userSignature = data.signature;
        const userChannelName = `private-${userAddress}`;

        storage.setItem("hc:signature", data.signature);

        // Note: setProfile expects 4 parameters but we only have address and signature here
        // The accessToken and refreshToken will be set later via setToken callback
        setProfile(userAddress, userSignature, '', '');

        log(`[Pusher] Subscribing to user channel: ${userChannelName}`);
        const userChannel = pusherClient.subscribe(userChannelName);
        
        let messageAttempted = false; // Prevent duplicate attempts
        
        log(`[Pusher] Binding to event: pusher:subscription_succeeded on ${userChannelName}`);
        userChannel.bind("pusher:subscription_succeeded", () => {
            log(`[Pusher] ✅ Subscription succeeded: ${userChannelName}`);
            if (!messageAttempted) {
                messageAttempted = true;
                // Small delay to ensure channel is fully ready before sending messages
                setTimeout(() => {
                    onConnectToUserChannel(userChannel, userProfile, SessionChannelName);
                }, 100);
            }
        });
        
        // Add timeout fallback in case subscription never succeeds (e.g., network issues)
        setTimeout(() => {
            if (!messageAttempted) {
                messageAttempted = true;
                logWarn(`[Pusher] ⚠️  Subscription timeout for ${userChannelName}, attempting to send anyway...`);
                onConnectToUserChannel(userChannel, userProfile, SessionChannelName);
            }
        }, 5000);
    } catch (error) {
        logError("Error setting up user subscription:", error);
    }
}
