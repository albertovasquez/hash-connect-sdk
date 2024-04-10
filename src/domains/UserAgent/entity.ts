const makeUserAgent = ({
  connect: _connect,
  openModal: _openModal,
  getQrCodeGenerator,
  getPusherClient,
}: {
  connect?: any;
  openModal?: any;
  getQrCodeGenerator: any;
  getPusherClient: any;
}) => {
  // privates
  let isConnected = false;
  let pusherClient: any = null;
  let qrCodeGenerator: any = null;
  let QRCodeString: string | null = null;
  let SessionChannelName: string | null = null;

  const connect = async () => {
    console.log("Connecting to HASH Pass");
    if (pusherClient === null) {
      pusherClient = await getPusherClient();

      const random = Math.random().toString(36).slice(2);
      QRCodeString = `hc:${random}`;
      SessionChannelName = `private-hc-${random}`;
    }
    _connect({ openModal, pusherClient, channelName: SessionChannelName });
  };

  const openModal = async () => {
    if (QRCodeString === null) {
      console.error({ QRCodeString });

      return;
    }
    console.log("Opening QR Code Modal");
    if (qrCodeGenerator === null) {
      qrCodeGenerator = await getQrCodeGenerator();
      const qrCodeDiv = document.getElementById("hash-connect-qrcode");
      qrCodeGenerator(qrCodeDiv, {
        text: QRCodeString,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: qrCodeGenerator.CorrectLevel.H,
      });
    }

    _openModal({ qrCodeGenerator });
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
    openModal,
  };
};

export default makeUserAgent;
