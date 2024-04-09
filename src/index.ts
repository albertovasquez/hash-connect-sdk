function loadScript(url: string, callback: () => void): void {
    const script = document.createElement("script");
    script.async = true;
    script.src = url;

    const entry = document.getElementsByTagName("script")[0];
    if (!entry || !entry.parentNode) {
        throw new Error("No script tags found in document");
    }
    entry.parentNode.insertBefore(script, entry);

    script.onload = function () {
        callback();

        // Detach the event handler to avoid memory leaks
        script.onload = null;
    };
}

const addElements = () => {
    const hashConnectWrapper = document.getElementById("hash-connect");

    const div = document.createElement("div");
    div.id = "hash-connect-profile";
    hashConnectWrapper?.appendChild(div);

    const button = document.createElement("button");
    button.id = "hash-connect-btn";
    button.textContent = "Open HASH";
    button.addEventListener("click", () => {
        window.HASHConnect.connect();
    });
    hashConnectWrapper?.appendChild(button);
};

const openModal = (qrString: string) => {
    const body = document.getElementsByTagName("body")[0];
    const modal = document.createElement("div");
    modal.id = "hash-connect-modal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "999";
    modal.innerHTML = `
        <div style="background-color: white; padding: 20px; border-radius: 10px;">
            <h2>Connect to HASH Pass</h2>
            <div id="hash-connect-qrcode"></div>
        </div>
    `;
    body.appendChild(modal);

    const qrCodeDiv = document.getElementById("hash-connect-qrcode");
    console.log({ qrString });
    var qrcode = new window.HASHConnect.QRCode(qrCodeDiv, {
        text: qrString,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.HASHConnect.QRCode.CorrectLevel.H,
    });
};

const onConnectToUserChannel = (userChannel: {
    trigger: (eventName: string, payload: any) => void;
}) => {
    const triggerData = {
        signature: window.HASHConnect.userProfile.signature,
        channel: window.HASHConnect.userProfile.channel,
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

const onVerifiedConnection = (data: any) => {
    console.log("client-hash-pass-verify");
    // Está conectado y se muestra el panel administrativo

    const btn = document.getElementById("hash-connect-btn");
    if (btn) {
        btn.style.display = "none";
    }
    const profileWrapper = document.getElementById("hash-connect-profile");
    if (profileWrapper) {
        profileWrapper.innerHTML = window.HASHConnect.userProfile.address!;
    }
};

const onReceiveVerifyRequest = (data: {
    address: string;
    signature: string;
}) => {
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

// Add or initialize the HASHConnect property on the window object
window.HASHConnect = window.HASHConnect || {
    isConnected: false,
    QRCode: null,
    QRCodeString: null,
    pusherInstance: null,
    userProfile: {
        address: null,
        channel: null,
        signature: null,
    },
    connect: () => {
        if (window.HASHConnect.isConnected) {
            console.log("Already connected to HASH");
        }

        try {
            const random = Math.random().toString(36).slice(2);
            const channelName = `private-hc-${random}`;
            window.HASHConnect.QRCodeString = `hc:${random}`;
            console.log("Connecting to Pusher Channel", channelName);
            let channel =
                window.HASHConnect.pusherInstance.subscribe(channelName);
            window.HASHConnect.isConnected = true;
            const btn = document.getElementById("hash-connect-btn");
            if (btn) {
                btn.setAttribute("disabled", "true");
            }

            // open QR code modal
            openModal(window.HASHConnect.QRCodeString);
            channel.bind("client-hash-pass-verify", () => {
                console.log("here");
            });
            channel.bind("client-hash-pass-connect", onReceiveVerifyRequest);
        } catch (ex) {
            console.error("Error connecting to HASH Pass");
            console.log(ex);
        }
    },
};

loadScript("https://js.pusher.com/8.0.1/pusher.min.js", () => {
    console.log("Loaded Pusher JS");
    const pusherInstance = new window.Pusher("18b9dd3c4dd15293792e" as string, {
        cluster: "sa1" as string,
        authEndpoint:
            "https://9bdsieu8yi.execute-api.us-east-1.amazonaws.com/auth/pusher",
    });
    window.HASHConnect.pusherInstance = pusherInstance;
});

loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    () => {
        console.log("Loaded QRCode JS");
        window.HASHConnect.QRCode = window.QRCode;
    }
);

addElements();
