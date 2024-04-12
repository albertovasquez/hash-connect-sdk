import getTokens from "../utils/auth";

const onConnectToUserChannel = (
    userChannel: {
        trigger: (eventName: string, payload: any) => void;
    },
    userProfile: {
        address: string | null;
        signature: string | null;
    },
    SessionChannelName: string
) => {
    const siteName = document.getElementsByTagName("title");

    const triggerData = {
        signature: userProfile.signature,
        channel: SessionChannelName,
        domain: window.location.hostname, //device
        name: siteName.length ? siteName[0].innerText : "Unknown site",
        orgHash: null,
    };
    let userData = userChannel.trigger(
        "client-hash-pass-request-verify",
        triggerData
    );
};

export default function setupUserSubscription(
    data: { address: string; signature: string },
    pusherClient: {
        subscribe: (channelName: string) => {
            bind: (val: string, fnc: () => void) => void;
            trigger: () => void;
        };
    },
    setProfile: (address: string, signature: string) => void,
    userProfile: {
        address: string | null;
        signature: string | null;
    },
    SessionChannelName: string
) {
    const userAddress = data?.address;
    const userSignature = data?.signature;
    const userChannelName = `private-${userAddress}`;

    localStorage.setItem("hc:signature", data.signature);

    setProfile(userAddress, userSignature);

    const userChannel = pusherClient.subscribe(userChannelName);
    userChannel.bind("pusher:subscription_succeeded", () =>
        onConnectToUserChannel(userChannel, userProfile, SessionChannelName)
    );
}
