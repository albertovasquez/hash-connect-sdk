import connect from "../../utils/connect";
import { openModal } from "../../utils/modal";
import { loadScript } from "../../utils/loadScript";
import makeUserAgent from "./entity";
import { CONFIG } from "../../config";

const getQrCodeGenerator = () => {
  return new Promise((resove, reject) => {
    loadScript( CONFIG.QR_CODE_SCRIPT,
      () => {
        resove(window.QRCode);
      }
    );
  }).catch(error => console.error("Error loading QR Code script", error));
};

const getPusherClient = () => {
  return new Promise((resove, reject) => {
    loadScript(CONFIG.PUSHER_SCRIPT, () => {
      try {
        const pusherInstance = new window.Pusher(CONFIG.PUSHER_KEY, {
          cluster: CONFIG.PUSHER_CLUSTER,
          authEndpoint: CONFIG.AUTH_ENDPOINT,
        });
        resove(pusherInstance);
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
});
