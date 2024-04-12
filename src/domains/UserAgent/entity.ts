const makeUserAgent = ({
    connect: _connect,
    openModal: _openModal,
    getQrCodeGenerator,
    getPusherClient,
    isExpired,
    getNewTokens,
}: {
    connect?: any;
    openModal?: any;
    getQrCodeGenerator: () => void;
    getPusherClient: () => void;
    isExpired: any;
    getNewTokens: any;
}) => {
    // privates
    let sessionId: string | null = null;
    let isConnected = false;
    let pusherClient: any = null;
    let qrCodeGenerator: any = null;
    let QRCodeString: string | null = null;
    let SessionChannelName: string | null = null;
    let profile = {
        address: null,
        signature: null,
        accessToken: null,
        refreshToken: null,
    } as {
        address: string | null;
        signature: string | null;
        accessToken: string | null | undefined;
        refreshToken: string | null | undefined;
    };

    if (localStorage.getItem("hc:accessToken")) {
        profile.accessToken = localStorage.getItem("hc:accessToken");
        profile.refreshToken = localStorage.getItem("hc:refreshToken");
        profile.signature = localStorage.getItem("hc:signature");
        profile.address = localStorage.getItem("hc:address");
    }

    const connect = async () => {
        if (isConnected) return;
        if (pusherClient === null) {
            pusherClient = await getPusherClient();
            if (!sessionId) {
                sessionId = Math.random().toString(36).slice(2);
                QRCodeString = `hc:${sessionId}`;
                SessionChannelName = `private-hc-${sessionId}`;
            }
        }

        // Se llama a _connect con un objeto que contiene openModal, pusherClient...
        _connect({
            openModal,
            pusherClient,
            channelName: SessionChannelName,
            setProfile: (
                address: string,
                signature: string,
                accessToken: string,
                refreshToken: string
            ) => {
                profile.address = address;
                profile.signature = signature;
                profile.accessToken = accessToken;
                profile.refreshToken = refreshToken;
            },
            getProfile: () => profile,
            setToken: (accessToken: string, refreshToken: string) => {
                profile.accessToken = accessToken;
                profile.refreshToken = refreshToken;
            },
        });
        isConnected = true;
    };

    const openModal = async () => {
        if (QRCodeString === null) {
            console.error({ QRCodeString });

            return;
        }
        if (qrCodeGenerator === null) {
            qrCodeGenerator = await getQrCodeGenerator();
        }

        const onClose = () => {
            localStorage.removeItem("hc:sessionId");
            pusherClient.unsubscribe(SessionChannelName);
            isConnected = false;
            profile = {
                address: null,
                signature: null,
                accessToken: null,
                refreshToken: null,
            };
        };

        const onReady = (qrCodeGenerator: any) => {
            return () => {
                localStorage.setItem("hc:sessionId", sessionId!);
                localStorage.removeItem("hc:address");
                localStorage.removeItem("hc:accessToken");
                localStorage.removeItem("hc:refreshToken");
                localStorage.removeItem("hc:signature");
                const qrCodeDiv = document.getElementById(
                    "hash-connect-qrcode"
                );
                new qrCodeGenerator(qrCodeDiv, {
                    text: QRCodeString,
                    width: 128,
                    height: 128,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: qrCodeGenerator.CorrectLevel.H,
                });
            };
        };

        _openModal(onReady(qrCodeGenerator), onClose);
    };

    // CHECK IF ANY DATA IN LOCAL STORAGE
    if (localStorage.getItem("hc:sessionId")) {
        sessionId = localStorage.getItem("hc:sessionId");
        QRCodeString = `hc:${sessionId}`;
        SessionChannelName = `private-hc-${sessionId}`;
        connect();
    }

    return Object.freeze({
        getToken: async () => {
            if (!isConnected) {
                console.warn("Not connected");
                return;
            }

            let accessToken: string | null = null;
            let refreshToken: string | null = null;
            const expired = isExpired(profile.accessToken);
            // if (expired) {
            // event refreshToken
            ({ accessToken, refreshToken } = await getNewTokens());
            localStorage.setItem("hc:accessToken", accessToken!);
            localStorage.setItem("hc:refreshToken", refreshToken!);
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            // }

            accessToken = profile.accessToken!;
            refreshToken = profile.refreshToken!;

            return { accessToken, refreshToken };
        },
        getUser: () => {
            if (!isConnected) {
                console.warn("Not connected");
                return;
            }

            const user: {
                address: string | null;
            } = {
                address: profile.address,
            };
            return user;
        },
        connect,
    });
};

export default makeUserAgent;
