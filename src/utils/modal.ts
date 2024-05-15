import translation from "./translation";

export const openModal = (onReady: () => void, onClose: () => void) => {
    const isConnectedAlready = localStorage.getItem("hc:sessionId");
    if (isConnectedAlready) {
        showConnectedButtons();
        return;
    }

    const body = document.getElementsByTagName("body")[0];
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

    document
        .getElementById("hash-connect-close-button")!
        .addEventListener("click", () => {
            closeModalDisconnect();
            onClose();
        });
    onReady();
};

export const closeModalDisconnect = () => {
    localStorage.removeItem("hc:sessionId");
    localStorage.removeItem("hc:accessToken");
    localStorage.removeItem("hc:refreshToken");
    localStorage.removeItem("hc:address");
    localStorage.removeItem("hc:signature");
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
};

export const closeModal = () => {
    const modal = document.getElementById("hash-connect-modal");
    if (modal) {
        modal.remove();
    }
};

export const showConnectedButtons = () => {
    const btn = document.getElementById("hash-connect-btn");
    if (btn) {
        btn.removeAttribute("disabled");
        btn.style.display = "none";
    }
};
