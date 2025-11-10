import translation from "./translation";
import { storage } from "./storage";
import { CONFIG, log, logError } from "../config";

export const openModal = (onReady: () => void, onClose: () => void) => {
    log('[Modal] openModal called');
    
    try {
        const isConnectedAlready = storage.getItem("hc:sessionId");
        log('[Modal] Checking existing session:', { hasSession: !!isConnectedAlready });
        
        if (isConnectedAlready) {
            log('[Modal] Already connected, showing connected buttons instead of modal');
            showConnectedButtons();
            return;
        }

        const body = document.getElementsByTagName("body")[0];
        if (!body) {
            logError("[Modal] ❌ Body element not found");
            return;
        }
        
        log('[Modal] Body element found, creating modal...');

        // Use custom disclaimer if provided, otherwise use default translation
        const disclaimerText = CONFIG.CUSTOM_DISCLAIMER || translation.translate("disclaimer");

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
                        ${disclaimerText}
                    </div>
                  </div>              
                  <div id="hash-connect-logo">
                    <img src="https://static.wixstatic.com/media/1c3ebd_9660355aa2644311ab42dfaece940db0~mv2.png/v1/fill/w_166,h_19,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/1c3ebd_9660355aa2644311ab42dfaece940db0~mv2.png" alt="Hash Pass" />
                  </div>
              </div>
          `;
        body.appendChild(modal);
        log('[Modal] ✅ Modal element created and added to DOM');

        const closeButton = document.getElementById("hash-connect-close-button");
        if (closeButton) {
            log('[Modal] ✅ Close button found, attaching click handler');
            closeButton.addEventListener("click", () => {
                try {
                    log('[Modal] Close button clicked');
                    closeModalDisconnect();
                    onClose();
                } catch (error) {
                    logError("[Modal] Error in close handler:", error);
                }
            });
        } else {
            logError('[Modal] ❌ Close button not found');
        }

        log('[Modal] Checking if onReady is a function:', typeof onReady === 'function');
        if (typeof onReady === 'function') {
            log('[Modal] Calling onReady callback...');
            onReady();
            log('[Modal] ✅ onReady callback completed');
        } else {
            logError('[Modal] ❌ onReady is not a function:', onReady);
        }
    } catch (error) {
        logError("[Modal] ❌ Error opening modal:", error);
    }
};

export const closeModalDisconnect = () => {
    try {
        log('[Modal] closeModalDisconnect called - cleaning up session');
        storage.removeItem("hc:sessionId");
        storage.removeItem("hc:accessToken");
        storage.removeItem("hc:refreshToken");
        storage.removeItem("hc:address");
        storage.removeItem("hc:signature");
        storage.removeItem("hc:clubId");
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

        // Dispatch disconnected event to update React state
        log('[Modal] Dispatching disconnected event to reset loading state');
        const event = new CustomEvent('hash-connect-event', {
            detail: {
                eventType: 'disconnected',
                user: null
            }
        });
        
        // Small delay to ensure cleanup is complete before dispatching
        setTimeout(() => {
            document.dispatchEvent(event);
            log('[Modal] ✅ Disconnected event dispatched to reset React state');
        }, 10);
    } catch (error) {
        logError("Error in closeModalDisconnect:", error);
    }
};

export const closeModal = () => {
    try {
        const modal = document.getElementById("hash-connect-modal");
        if (modal) {
            modal.remove();
        }
    } catch (error) {
        logError("Error closing modal:", error);
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
        logError("Error showing connected buttons:", error);
    }
};
