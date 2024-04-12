import handleHashConnect from "../eventListeners/handleHashConnect";
import setupUserSubscription from "../eventListeners/setupUserSubscription";

export default function connect({
  openModal,
  pusherClient,
  channelName,
  setProfile,
  getProfile,
  setToken,
}: {
  openModal: () => void;
  pusherClient: {
    subscribe: (channelName: string) => any;
  };
  channelName: string;
  setProfile: (address: string, signature: string) => void;
  getProfile: () => {
    address: string | null;
    signature: string | null;
    accessToken: string | null;
    refreshToken: string | null;
  };
  setToken: (accessToken: string, refreshToken: string) => void;
}) {
  try {
    let channel = pusherClient.subscribe(channelName);
    const btn = document.getElementById("hash-connect-btn");
    if (btn) {
      console.log({ btn });
      btn.setAttribute("disabled", "true");
    }

    if (
      localStorage.getItem("hc:address") != null &&
      localStorage.getItem("hc:accessToken") != null
    ) {
      openModal();
      handleHashConnect(
        {
          address: getProfile().address!,
          accessToken: getProfile().accessToken!,
          refreshToken: getProfile().refreshToken!,
        },
        setToken
      );
      return;
    } else {
      console.log("Clearning Session");
      localStorage.removeItem("hc:sessionId");
      openModal();
    }

    // open QR code modal
    console.log({ sessionId: channelName });
    console.log({ address: getProfile().address });
    console.log({
      accessToken: getProfile().accessToken,
      refreshToken: getProfile().refreshToken,
    });

    channel.bind(
      "client-hash-pass-verify",
      (data: { address: string; accessToken: string; refreshToken: string }) =>
        handleHashConnect(data, setToken)
    );
    channel.bind(
      "client-hash-pass-connect",
      (data: { address: string; signature: string }) => {
        const profile = getProfile();
        setupUserSubscription(
          data,
          pusherClient,
          setProfile,
          profile,
          channelName
        );
      }
    );
  } catch (ex) {
    console.error("Error connecting to HASH Pass");
    console.log(ex);
  }
}
