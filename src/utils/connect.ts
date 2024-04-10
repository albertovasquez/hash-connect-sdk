import onVerifiedConnection from "../eventListeners/verifiedConnection";
import onReceiveVerifyRequest from "../eventListeners/verifyRequest";

export default function connect({
    openModal,
    pusherClient,
    channelName,
    setProfile,
    getProfile,
}: {
    openModal: () => void;
    pusherClient: {
        subscribe: (channelName: string) => any;
    };
    channelName: string;
    setProfile: (
        address: string,
        signature: string,
        channelName: string
    ) => void;
    getProfile: () => {
        address: string | null;
        channel: string | null;
        signature: string | null;
    };
}) {
    try {
        let channel = pusherClient.subscribe(channelName);
        const btn = document.getElementById("hash-connect-btn");
        if (btn) {
            btn.setAttribute("disabled", "true");
        }

        // open QR code modal
        openModal();
        channel.bind(
            "client-hash-pass-verify",
            (data: { address: string; token: string }) =>
                onVerifiedConnection(data)
        );
        channel.bind(
            "client-hash-pass-connect",
            (data: { address: string; signature: string }) => {
                const profile = getProfile();
                onReceiveVerifyRequest(
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
        console.log(ex);
    }
}
