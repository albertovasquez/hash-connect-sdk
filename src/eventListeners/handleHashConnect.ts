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
    console.log('[HashConnect] handleHashConnect called with data:', { 
      address: data?.address, 
      hasAccessToken: !!data?.accessToken,
      hasRefreshToken: !!data?.refreshToken 
    });
    
    // Validate input data
    if (!data || !data.address || !data.accessToken || !data.refreshToken) {
      console.error("[HashConnect] ❌ Invalid connection data received");
      return;
    }

    console.log('[HashConnect] Storing tokens and address...');
    storage.setItem("hc:accessToken", data.accessToken);
    storage.setItem("hc:refreshToken", data.refreshToken);
    storage.setItem("hc:address", data.address);

    setToken(data.accessToken, data.refreshToken);

    // Dispatch connected event (do this BEFORE any DOM checks so React hooks get notified)
    console.log('[HashConnect] Dispatching connected event...');
    const connectEvent = new CustomEvent("hash-connect-event", {
      detail: {
        eventType: "connected",
        user: data.address,
      },
    });

    try {
      document.dispatchEvent(connectEvent);
      console.log('[HashConnect] ✅ Connected event dispatched successfully');
    } catch (error) {
      console.error("[HashConnect] ❌ Error dispatching connect event:", error);
    }

    // Hide connect button if it exists
    const btn = document.getElementById("hash-connect-btn");
    if (btn) {
      btn.style.display = "none";
    }

    // Set up disconnect button if profile wrapper exists (vanilla JS integration)
    const profileWrapper = document.getElementById("hash-connect-profile");
    if (profileWrapper) {
      console.log('[HashConnect] Profile wrapper found, setting up disconnect button...');
      const content = `<button id="hash-connect-disconnect-btn">
      <span id="hash-connect-disconnect-btn-span">${translation.translate(
        "disconnect"
      )}</span>
      </button>`;

      profileWrapper.innerHTML = content;

      const disconnectBtn = document.getElementById("hash-connect-disconnect-btn");
      if (disconnectBtn) {
        disconnectBtn.onclick = () => {
          try {
            console.log('[HashConnect] Disconnect button clicked');
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
    } else {
      console.log('[HashConnect] No profile wrapper found (React integration - using hook disconnect)');
    }

    console.log('[HashConnect] Closing modal...');
    closeModal();
    console.log('[HashConnect] ✅ Connection complete!');
  } catch (error) {
    console.error("[HashConnect] ❌ Error in handleHashConnect:", error);
  }
}
