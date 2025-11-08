/**
 * Type definitions for QRCode library
 */

export enum QRCodeCorrectLevel {
  L = 1,
  M = 0,
  Q = 3,
  H = 2
}

export interface QRCodeOptions {
  text: string;
  width: number;
  height: number;
  colorDark: string;
  colorLight: string;
  correctLevel: QRCodeCorrectLevel;
}

export interface QRCodeConstructor {
  new (element: HTMLElement, options: QRCodeOptions): QRCode;
  CorrectLevel: {
    L: QRCodeCorrectLevel;
    M: QRCodeCorrectLevel;
    Q: QRCodeCorrectLevel;
    H: QRCodeCorrectLevel;
  };
}

export interface QRCode {
  clear: () => void;
  makeCode: (text: string) => void;
}

