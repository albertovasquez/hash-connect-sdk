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
        token: string | null;
    };
}) {
    try {
        let channel = pusherClient.subscribe(channelName);
        const btn = document.getElementById("hash-connect-btn");
        if (btn) {
            btn.setAttribute("disabled", "true");
        }

        if (
            localStorage.getItem("hc:address") != null &&
            localStorage.getItem("hc:token") != null
        ) {
            openModal();
            onVerifiedConnection({
                address: getProfile().address!,
                token: getProfile().token!,
            });
            return;
        } else {
            console.log("Clearning Session");
            localStorage.removeItem("hc:sessionId");
            openModal();
        }

        // open QR code modal
        console.log({ sessionId: channelName });
        console.log({ address: getProfile().address });
        console.log({ token: getProfile().token });

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
