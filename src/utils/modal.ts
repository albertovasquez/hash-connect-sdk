export const openModal = (onReady: () => void) => {
    const body = document.getElementsByTagName("body")[0];
    const modal = document.createElement("div");
    modal.id = "hash-connect-modal";

    modal.innerHTML = `
          <div id="hash-connect-modal-content">
              <button id="close-button">X</button>
              <h2>Connect to HASH Pass</h2>
              <div id="hash-connect-qrcode"></div>
          </div>
      `;
    body.appendChild(modal);

    document
        .getElementById("close-button")!
        .addEventListener("click", closeModalDisconnect);

    onReady();
};

export const closeModalDisconnect = () => {
    closeModal();

    // window.HASHConnect.pusherInstance.unsubscribe(
    //   window.HASHConnect.SessionChannelName
    // );
    // window.HASHConnect.isConnected = false;
    // window.HASHConnect.userProfile = {
    //   address: null,
    //   channel: null,
    //   signature: null,
    // };

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
