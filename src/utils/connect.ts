import onVerifiedConnection from "../eventListeners/verifiedConnection";
import onReceiveVerifyRequest from "../eventListeners/verifyRequest";

export default function connect({
  openModal,
  pusherClient,
  channelName,
}: {
  openModal: () => void;
  pusherClient: {
    subscribe: (channelName: string) => any;
  };
  channelName: string;
}) {
  if (window.HASHConnect.isConnected) {
    console.log("Already connected to HASH");
  }

  try {
    // const random = Math.random().toString(36).slice(2);
    // const channelName = `private-hc-${random}`;
    // window.HASHConnect.QRCodeString = `hc:${random}`;
    // window.HASHConnect.SessionChannelName = `private-hc-${random}`;
    // console.log("Connecting to Pusher Channel", channelName);
    let channel = pusherClient.subscribe(channelName);
    window.HASHConnect.setIsConnected(true);
    const btn = document.getElementById("hash-connect-btn");
    if (btn) {
      btn.setAttribute("disabled", "true");
    }

    // open QR code modal
    openModal();
    channel.bind("client-hash-pass-verify", onVerifiedConnection);
    channel.bind("client-hash-pass-connect", onReceiveVerifyRequest);
  } catch (ex) {
    console.error("Error connecting to HASH Pass");
    console.log(ex);
  }
}
