// global.d.ts
export {}; // Ensure this file is treated as a module

type IHashConnect = {
    connect: () => void;
    isConnected: boolean;
    pusherInstance: any;
    QRCode: any;
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
