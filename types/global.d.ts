// global.d.ts
import { QRCodeConstructor } from '../src/types/qrcode';
import { PusherClient } from '../src/types/pusher';

export {}; // Ensure this file is treated as a module

export interface IHashConnect {
    connect: () => Promise<void>;
    disconnect: () => void;
    getToken: () => Promise<string | null>;
    getUser: () => { address: string | null } | undefined;
    getClubId: () => string | null;
    getClubName: () => string | null;
    isReady: () => boolean;
    _storage?: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
        removeItem: (key: string) => void;
        clear: () => void;
    };
}

declare global {
    interface Window {
        HASHConnect: IHashConnect;
        Pusher: new (key: string, config: any) => PusherClient;
        QRCode: QRCodeConstructor;
    }
}
