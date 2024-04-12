import handleHashConnect from "../eventListeners/handleHashConnect";
import setupUserSubscription from "../eventListeners/setupUserSubscription";

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
    pusherClient: {
        subscribe: (channelName: string) => any;
    };
    channelName: string;
    setProfile: (address: string, signature: string) => void;
    getProfile: () => {
        address: string | null;
        signature: string | null;
        accessToken: string | null;
        refreshToken: string | null;
    };
    setToken: (accessToken: string, refreshToken: string) => void;
    onDisconnect: () => void;
}) {
    try {
        let channel = pusherClient.subscribe(channelName);
        const btn = document.getElementById("hash-connect-btn");
        if (btn) {
            btn.setAttribute("disabled", "true");
        }

        if (
            localStorage.getItem("hc:address") != null &&
            localStorage.getItem("hc:accessToken") != null
        ) {
            openModal();
            handleHashConnect(
                {
                    address: getProfile().address!,
                    accessToken: getProfile().accessToken!,
                    refreshToken: getProfile().refreshToken!,
                },
                setToken,
                onDisconnect
            );
            return;
        } else {
            localStorage.removeItem("hc:sessionId");
            openModal();
        }
        channel.bind(
            "client-hash-pass-verify",
            (data: {
                address: string;
                accessToken: string;
                refreshToken: string;
            }) => handleHashConnect(data, setToken, onDisconnect)
        );
        channel.bind(
            "client-hash-pass-connect",
            (data: { address: string; signature: string }) => {
                const profile = getProfile();
                setupUserSubscription(
                    data,
                    pusherClient,
                    setProfile,
                    profile,
                    channelName
                );
            }
        );
    } catch (ex) {
        console.error("Error connecting to HASH Pass");
        console.info(ex);
    }
}
