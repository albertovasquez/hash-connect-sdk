import { CONFIG } from "../config";

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
    console.log(userProfile, SessionChannelName);
    const triggerData = {
        signature: userProfile.signature,
        channel: SessionChannelName,
        domain: CONFIG.DOMAIN,
        name: CONFIG.APP_NAME,
        orgHash: null,
    };
    let userData = userChannel.trigger(
        "client-hash-pass-request-verify",
        triggerData
    );
    console.log({
        event: "client-hash-pass-request-verify",
        userData,
        triggerData,
    });
};

export default (
    data: { address: string; signature: string },
    pusherClient: {
        subscribe: (channelName: string) => {
            bind: (val: string, fnc: () => void) => void;
            trigger: () => void;
        };
    },
    setProfile: (
        address: string,
        signature: string,
        channelName: string
    ) => void,
    userProfile: {
        address: string | null;
        signature: string | null;
    },
    SessionChannelName: string
) => {
    const userAddress = data?.address;
    const userSignature = data?.signature;
    const userChannelName = `private-${userAddress}`;

    setProfile(userAddress, userSignature, userChannelName);

    const userChannel = pusherClient.subscribe(userChannelName);
    userChannel.bind("pusher:subscription_succeeded", () =>
        onConnectToUserChannel(userChannel, userProfile, SessionChannelName)
    );
};
