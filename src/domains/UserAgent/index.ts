import connect from "../../utils/connect";
import { openModal } from "../../utils/modal";
import { loadScript } from "../../utils/loadScript";
import makeUserAgent from "./entity";
import { CONFIG } from "../../config";
import { isExpired } from "../../utils/jwt";
import getNewTokens from "../../utils/auth";
import { PusherClient } from "../../types/pusher";
import { QRCodeConstructor } from "../../types/qrcode";

const getQrCodeGenerator = async (): Promise<QRCodeConstructor> => {
  return new Promise<QRCodeConstructor>((resolve, reject) => {
    loadScript(CONFIG.QR_CODE_SCRIPT, () => {
      if (window.QRCode) {
        resolve(window.QRCode);
      } else {
        reject(new Error("QRCode library not loaded"));
      }
    });
  });
};

const getPusherClient = async (): Promise<PusherClient> => {
  return new Promise<PusherClient>((resolve, reject) => {
    loadScript(CONFIG.PUSHER_SCRIPT, () => {
      try {
        if (!window.Pusher) {
          throw new Error("Pusher library not loaded");
        }
        const pusherInstance = new window.Pusher(CONFIG.PUSHER_KEY, {
          cluster: CONFIG.PUSHER_CLUSTER,
          authEndpoint: `${CONFIG.AUTH_ENDPOINT}/auth/pusher`,
        });
        resolve(pusherInstance as PusherClient);
      } catch (error) {
        reject(error);
      }
    });
  });
};

export default makeUserAgent({
  connect,
  openModal,
  getPusherClient,
  getQrCodeGenerator,
  isExpired,
  getNewTokens,
});
