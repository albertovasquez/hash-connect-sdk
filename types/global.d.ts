/**
 * Global type declarations for HashConnect SDK v3
 * 
 * Note: window.HASHConnect has been removed in v3.
 * Use the React Provider and hooks instead.
 */

import { QRCodeConstructor } from '../src/types/qrcode';
import { PusherClient } from '../src/types/pusher';

export {}; // Ensure this file is treated as a module

declare global {
  interface Window {
    /**
     * Pusher client loaded from CDN
     * @see https://pusher.com/docs/channels/
     */
    Pusher: new (key: string, config: any) => PusherClient;
    
    /**
     * QRCode library loaded from CDN
     * @see https://davidshimjs.github.io/qrcodejs/
     */
    QRCode: QRCodeConstructor;
  }
}
