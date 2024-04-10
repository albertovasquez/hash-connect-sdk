import "./styles.css";
import connect from "./utils/connect";
import { loadScript } from "./utils/loadScript";

const addElements = () => {
  const hashConnectWrapper = document.getElementById("hash-connect");

  const div = document.createElement("div");
  div.id = "hash-connect-profile";
  hashConnectWrapper?.appendChild(div);

  const button = document.createElement("button");
  button.id = "hash-connect-btn";
  button.textContent = "Open HASH";
  button.addEventListener("click", () => {
    window.HASHConnect.connect();
  });
  hashConnectWrapper?.appendChild(button);
};

// Add or initialize the HASHConnect property on the window object
window.HASHConnect = window.HASHConnect || {
  isConnected: false,
  QRCode: null,
  QRCodeString: null,
  pusherInstance: null,
  SessionChannelName: null,
  userProfile: {
    address: null,
    channel: null,
    signature: null,
  },
  connect,
};

loadScript("https://js.pusher.com/8.0.1/pusher.min.js", () => {
  console.log("Loaded Pusher JS");
  const pusherInstance = new window.Pusher("18b9dd3c4dd15293792e" as string, {
    cluster: "sa1" as string,
    authEndpoint:
      "https://9bdsieu8yi.execute-api.us-east-1.amazonaws.com/auth/pusher",
  });
  window.HASHConnect.pusherInstance = pusherInstance;
});

loadScript(
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  () => {
    console.log("Loaded QRCode JS");
    window.HASHConnect.QRCode = window.QRCode;
  }
);

addElements();
