import connect from "../../utils/connect";
import { openModal } from "../../utils/modal";
import { loadScript } from "../../utils/loadScript";
import makeUserAgent from "./entity";
import { CONFIG } from "../../config";
import { isExpired } from "../../utils/jwt";
import getNewTokens from "../../utils/auth";

const getQrCodeGenerator = () => {
  return new Promise((resolve, reject) => {
    loadScript(CONFIG.QR_CODE_SCRIPT, () => {
      resolve(window.QRCode);
    });
  }).catch((error) => console.error("Error loading QR Code script", error));
};

const getPusherClient = () => {
  return new Promise((resolve, reject) => {
    loadScript(CONFIG.PUSHER_SCRIPT, () => {
      try {
        const pusherInstance = new window.Pusher(CONFIG.PUSHER_KEY, {
          cluster: CONFIG.PUSHER_CLUSTER,
          authEndpoint: `${CONFIG.AUTH_ENDPOINT}/auth/pusher`,
        });
        resolve(pusherInstance);
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
