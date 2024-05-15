import { closeModal, closeModalDisconnect } from "../utils/modal";
import translation from "../utils/translation";

export default function handleHashConnect(
  data: { address: string; accessToken: string; refreshToken: string },
  setToken: (accessToken: string, refreshToken: string) => void,
  onDisconnect: () => void
) {
  localStorage.setItem("hc:accessToken", data.accessToken);
  localStorage.setItem("hc:refreshToken", data.refreshToken);
  localStorage.setItem("hc:address", data.address);

  setToken(data.accessToken, data.refreshToken);

  const btn = document.getElementById("hash-connect-btn");
  if (btn) {
    btn.style.display = "none";
  }

  const profileWrapper = document.getElementById("hash-connect-profile");
  if (profileWrapper) {
    const content = `<button id="hash-connect-disconnect-btn">
    <span id="hash-connect-disconnect-btn-span">${translation.translate(
      "disconnect"
    )}</span>
    </button>`;

    const connectEvent = new CustomEvent("hash-connect-event", {
      detail: {
        eventType: "connected",
        user: data.address,
      },
    });

    // Emitir el evento
    document.dispatchEvent(connectEvent);

    profileWrapper.innerHTML = content;

    document.getElementById("hash-connect-disconnect-btn")!.onclick = () => {
      closeModalDisconnect();
      onDisconnect();
      const disconnectEvent = new CustomEvent("hash-connect-event", {
        detail: {
          eventType: "disconnected",
        },
      });

      // Emitir el evento
      document.dispatchEvent(disconnectEvent);
    };
  }

  closeModal();
}
