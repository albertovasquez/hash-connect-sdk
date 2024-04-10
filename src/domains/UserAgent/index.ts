import connect from "../../utils/connect";
import { loadScript } from "../../utils/loadScript";
import makeUserAgent from "./entity";

const getQrCodeGenerator = () => {
    return new Promise((resove, reject) => {
        loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
            () => {
                console.log("Loaded QRCode JS");
                resove(window.QRCode);
            }
        );
    });
};

const getPusherClient = () => {
    return new Promise((resove, reject) => {
        loadScript("https://js.pusher.com/8.0.1/pusher.min.js", () => {
            console.log("Loaded QRCode JS");
            try {
                const pusherInstance = new window.Pusher(
                    "18b9dd3c4dd15293792e" as string,
                    {
                        cluster: "sa1" as string,
                        authEndpoint:
                            "https://9bdsieu8yi.execute-api.us-east-1.amazonaws.com/auth/pusher",
                    }
                );
                resove(pusherInstance);
            } catch (error) {
                reject(error);
            }
        });
    });
};

export default makeUserAgent({ connect, getPusherClient, getQrCodeGenerator });
