// global.d.ts
import { QRCodeConstructor } from '../src/types/qrcode';
import { PusherClient } from '../src/types/pusher';

export {}; // Ensure this file is treated as a module

export interface IHashConnect {
    connect: () => Promise<void>;
    getToken: () => Promise<string | null>;
    getUser: () => { address: string | null } | undefined;
    isReady: () => boolean;
}

declare global {
    interface Window {
        HASHConnect: IHashConnect;
        Pusher: new (key: string, config: any) => PusherClient;
        QRCode: QRCodeConstructor;
    }
}
