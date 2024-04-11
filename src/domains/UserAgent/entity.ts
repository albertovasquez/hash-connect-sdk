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
  let sessionId: string | null = null;
  let isConnected = false;
  let pusherClient: any = null;
  let qrCodeGenerator: any = null;
  let QRCodeString: string | null = null;
  let SessionChannelName: string | null = null;
  let profile = {
    address: null,
    channel: null,
    signature: null,
  } as {
    address: string | null;
    channel: string | null;
    signature: string | null;
    token: string | null;
  };

  if (localStorage.getItem("hc:token")) {
    profile.token = localStorage.getItem("hc:token");
    profile.address = localStorage.getItem("hc:address");
  }

  const connect = async () => {
    if (isConnected) return;
    console.log("Connecting to HASH Pass");
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
      setProfile: (address: string, signature: string, channelName: string) => {
        profile.address = address;
        profile.signature = signature;
        profile.channel = channelName;
      },
      getProfile: () => profile,
    });
    isConnected = true;
  };

  const openModal = async () => {
    if (QRCodeString === null) {
      console.error({ QRCodeString });

      return;
    }
    console.log("Opening QR Code Modal");
    if (qrCodeGenerator === null) {
      qrCodeGenerator = await getQrCodeGenerator();
    }

    const onClose = () => {
      console.log("Modal Closed By Entity");
      localStorage.removeItem("hc:sessionId");
      pusherClient.unsubscribe(SessionChannelName);
      isConnected = false;
      profile = {
        address: null,
        channel: null,
        signature: null,
        token: null,
      };
    };

    const onReady = (qrCodeGenerator: any) => {
      return () => {
        localStorage.setItem("hc:sessionId", sessionId!);
        const qrCodeDiv = document.getElementById("hash-connect-qrcode");
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

  return {
    getUser: () => {
      const user: {
        address: string | null;
        token?: string | null;
      } = {
        address: profile.address,
      };
      if (isConnected) {
        user.token = profile.token;
      }
      return user;
    },
    connect,
  };
};

export default makeUserAgent;
