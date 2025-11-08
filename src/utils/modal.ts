import translation from "./translation";
import { storage } from "./storage";

export const openModal = (onReady: () => void, onClose: () => void) => {
    try {
        const isConnectedAlready = storage.getItem("hc:sessionId");
        if (isConnectedAlready) {
            showConnectedButtons();
            return;
        }

        const body = document.getElementsByTagName("body")[0];
        if (!body) {
            console.error("Body element not found");
            return;
        }

        const modal = document.createElement("div");
        modal.id = "hash-connect-modal";

        modal.innerHTML = `
              <div id="hash-connect-modal-content">
                  <button id="hash-connect-close-button">✕</button>
                  <div id="hash-connect-content">
                    <h1>Hass Pass</h1>
                    <h2>Connect</h2>
                    <div id="hash-connect-qrcode"></div>
                    <div id="hash-connect-modal-footer">
                        ${translation.translate("disclaimer")}
                    </div>
                  </div>              
                  <div id="hash-connect-logo">
                    <img src="https://static.wixstatic.com/media/1c3ebd_9660355aa2644311ab42dfaece940db0~mv2.png/v1/fill/w_166,h_19,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/1c3ebd_9660355aa2644311ab42dfaece940db0~mv2.png" alt="Hash Pass" />
                  </div>
              </div>
          `;
        body.appendChild(modal);

        const closeButton = document.getElementById("hash-connect-close-button");
        if (closeButton) {
            closeButton.addEventListener("click", () => {
                try {
                    closeModalDisconnect();
                    onClose();
                } catch (error) {
                    console.error("Error in close handler:", error);
                }
            });
        }

        if (typeof onReady === 'function') {
            onReady();
        }
    } catch (error) {
        console.error("Error opening modal:", error);
    }
};

export const closeModalDisconnect = () => {
    try {
        storage.removeItem("hc:sessionId");
        storage.removeItem("hc:accessToken");
        storage.removeItem("hc:refreshToken");
        storage.removeItem("hc:address");
        storage.removeItem("hc:signature");
        closeModal();
        
        const profileWrapper = document.getElementById("hash-connect-profile");
        if (profileWrapper) {
            profileWrapper.innerHTML = "";
        }

        const btn = document.getElementById("hash-connect-btn");
        if (btn) {
            btn.removeAttribute("disabled");
            btn.style.display = "block";
        }
    } catch (error) {
        console.error("Error in closeModalDisconnect:", error);
    }
};

export const closeModal = () => {
    try {
        const modal = document.getElementById("hash-connect-modal");
        if (modal) {
            modal.remove();
        }
    } catch (error) {
        console.error("Error closing modal:", error);
    }
};

export const showConnectedButtons = () => {
    try {
        const btn = document.getElementById("hash-connect-btn");
        if (btn) {
            btn.removeAttribute("disabled");
            btn.style.display = "none";
        }
    } catch (error) {
        console.error("Error showing connected buttons:", error);
    }
};
