// global.d.ts
export {}; // Ensure this file is treated as a module

type IHashConnect = {
    connect: any;
    openModal: () => void;
    setIsConnected: (value: boolean) => void;
    setPusherClient: (client: any) => void;
    setQRCodeGenerator: (generator: any) => void;
    isConnected: boolean;
    SessionChannelName: string | null;
    QRCodeString: string | null;
    userProfile: {
        address: string | null;
        channel: string | null;
        signature: string | null;
    };
};

declare global {
    interface Window {
        HASHConnect: IHashConnect;
        Pusher: any;
        QRCode: any;
    }
}
