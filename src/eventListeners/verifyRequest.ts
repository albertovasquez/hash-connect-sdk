const onConnectToUserChannel = (userChannel: {
    trigger: (eventName: string, payload: any) => void;
}) => {
    const triggerData = {
        signature: window.HASHConnect.userProfile.signature,
        channel: window.HASHConnect.SessionChannelName,
        domain: "localhost",
        name: "Hash Pass Admin Panel",
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

export default (data: { address: string; signature: string }) => {
    const userAddress = data?.address;
    const userSignature = data?.signature;
    const userChannelName = `private-${userAddress}`;

    window.HASHConnect.userProfile.address = userAddress;
    window.HASHConnect.userProfile.signature = userSignature;
    window.HASHConnect.userProfile.channel = userChannelName;
    console.log({ profile: window.HASHConnect.userProfile });

    const userChannel =
        window.HASHConnect.pusherInstance.subscribe(userChannelName);
    userChannel.bind("pusher:subscription_succeeded", () =>
        onConnectToUserChannel(userChannel)
    );

    console.log({ userChannel });
};
