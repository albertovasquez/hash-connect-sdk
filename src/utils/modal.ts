import translation from "./translation";
import { storage } from "./storage";

export const openModal = (onReady: () => void, onClose: () => void) => {
    console.log('[Modal] openModal called');
    
    try {
        const isConnectedAlready = storage.getItem("hc:sessionId");
        console.log('[Modal] Checking existing session:', { hasSession: !!isConnectedAlready });
        
        if (isConnectedAlready) {
            console.log('[Modal] Already connected, showing connected buttons instead of modal');
            showConnectedButtons();
            return;
        }

        const body = document.getElementsByTagName("body")[0];
        if (!body) {
            console.error("[Modal] ❌ Body element not found");
            return;
        }
        
        console.log('[Modal] Body element found, creating modal...');

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
        console.log('[Modal] ✅ Modal element created and added to DOM');

        const closeButton = document.getElementById("hash-connect-close-button");
        if (closeButton) {
            console.log('[Modal] ✅ Close button found, attaching click handler');
            closeButton.addEventListener("click", () => {
                try {
                    console.log('[Modal] Close button clicked');
                    closeModalDisconnect();
                    onClose();
                } catch (error) {
                    console.error("[Modal] Error in close handler:", error);
                }
            });
        } else {
            console.error('[Modal] ❌ Close button not found');
        }

        console.log('[Modal] Checking if onReady is a function:', typeof onReady === 'function');
        if (typeof onReady === 'function') {
            console.log('[Modal] Calling onReady callback...');
            onReady();
            console.log('[Modal] ✅ onReady callback completed');
        } else {
            console.error('[Modal] ❌ onReady is not a function:', onReady);
        }
    } catch (error) {
        console.error("[Modal] ❌ Error opening modal:", error);
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
