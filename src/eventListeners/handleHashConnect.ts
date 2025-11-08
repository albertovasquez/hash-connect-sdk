import { closeModal, closeModalDisconnect } from "../utils/modal";
import translation from "../utils/translation";
import { storage } from "../utils/storage";
import { AuthData } from "../types/user";

export default function handleHashConnect(
  data: AuthData,
  setToken: (accessToken: string, refreshToken: string) => void,
  onDisconnect: () => void
) {
  try {
    // Validate input data
    if (!data || !data.address || !data.accessToken || !data.refreshToken) {
      console.error("Invalid connection data received");
      return;
    }

    storage.setItem("hc:accessToken", data.accessToken);
    storage.setItem("hc:refreshToken", data.refreshToken);
    storage.setItem("hc:address", data.address);

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

      // Emit the event
      try {
        document.dispatchEvent(connectEvent);
      } catch (error) {
        console.error("Error dispatching connect event:", error);
      }

      profileWrapper.innerHTML = content;

      const disconnectBtn = document.getElementById("hash-connect-disconnect-btn");
      if (disconnectBtn) {
        disconnectBtn.onclick = () => {
          try {
            closeModalDisconnect();
            onDisconnect();
            const disconnectEvent = new CustomEvent("hash-connect-event", {
              detail: {
                eventType: "disconnected",
              },
            });

            // Emit the event
            document.dispatchEvent(disconnectEvent);
          } catch (error) {
            console.error("Error handling disconnect:", error);
          }
        };
      }
    }

    closeModal();
  } catch (error) {
    console.error("Error in handleHashConnect:", error);
  }
}
