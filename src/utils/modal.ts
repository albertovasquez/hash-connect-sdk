export const openModal = (qrString: string) => {
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

  const qrCodeDiv = document.getElementById("hash-connect-qrcode");
  console.log({ qrString });
  var qrcode = new window.HASHConnect.QRCode(qrCodeDiv, {
    text: qrString,
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: window.HASHConnect.QRCode.CorrectLevel.H,
  });

  document
    .getElementById("close-button")!
    .addEventListener("click", closeModalDisconnect);
};

export const closeModalDisconnect = () => {
  closeModal();

  window.HASHConnect.pusherInstance.unsubscribe(
    window.HASHConnect.SessionChannelName
  );
  window.HASHConnect.isConnected = false;
  window.HASHConnect.userProfile = {
    address: null,
    channel: null,
    signature: null,
  };

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
