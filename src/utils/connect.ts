import onVerifiedConnection from "../eventListeners/verifiedConnection";
import onReceiveVerifyRequest from "../eventListeners/verifyRequest";
import { openModal } from "./modal";

export default function connect() {
  if (window.HASHConnect.isConnected) {
    console.log("Already connected to HASH");
  }

  try {
    const random = Math.random().toString(36).slice(2);
    const channelName = `private-hc-${random}`;
    window.HASHConnect.QRCodeString = `hc:${random}`;
    window.HASHConnect.SessionChannelName = `private-hc-${random}`;
    console.log("Connecting to Pusher Channel", channelName);
    let channel = window.HASHConnect.pusherInstance.subscribe(channelName);
    window.HASHConnect.isConnected = true;
    const btn = document.getElementById("hash-connect-btn");
    if (btn) {
      btn.setAttribute("disabled", "true");
    }

    // open QR code modal
    openModal(window.HASHConnect.QRCodeString);
    channel.bind("client-hash-pass-verify", onVerifiedConnection);
    channel.bind("client-hash-pass-connect", onReceiveVerifyRequest);
  } catch (ex) {
    console.error("Error connecting to HASH Pass");
    console.log(ex);
  }
}
