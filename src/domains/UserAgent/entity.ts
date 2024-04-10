const makeUserAgent = ({
    connect: _connect,
    getQrCodeGenerator,
    getPusherClient,
}: {
    connect?: any;
    getQrCodeGenerator: any;
    getPusherClient: any;
}) => {
    // privates
    let isConnected = false;
    let pusherClient: any = null;
    let qrCodeGenerator: any = null;

    const connect = async () => {
        console.log("Connecting to HASH Pass");
        if (pusherClient === null) {
            pusherClient = await getPusherClient();
        }
        if (qrCodeGenerator === null) {
            qrCodeGenerator = await getQrCodeGenerator();
        }
        _connect({ pusherClient });
    };

    return {
        getIsConnected: () => isConnected,
        setIsConnected: (value: boolean) => {
            isConnected = value;
        },
        setPusherClient: (client: any) => {
            pusherClient = client;
        },
        setQRCodeGenerator: (generator: any) => {
            qrCodeGenerator = generator;
        },
        QRCodeString: null,
        SessionChannelName: null,
        userProfile: {
            address: null,
            channel: null,
            signature: null,
        },
        connect,
    };
};

export default makeUserAgent;
