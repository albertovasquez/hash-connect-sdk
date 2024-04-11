import { closeModal, closeModalDisconnect } from "../utils/modal";

export default (data: { address: string; token: string }) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  console.log("client-hash-pass-verify");

  localStorage.setItem("hc:token", data.token);
  localStorage.setItem("hc:address", data.address);

  const btn = document.getElementById("hash-connect-btn");
  if (btn) {
    btn.style.display = "none";
  }

  const profileWrapper = document.getElementById("hash-connect-profile");
  if (profileWrapper) {
    const content = `<div id="hash-connect-disconnect-div">
                           <span id="hash-connect-disconnect-span">${formatAddress(data.address)}</span>
                           <button id="hash-connect-disconnect-btn">Disconnect</button>
                         </div>`;
        profileWrapper.innerHTML = content;

        document.getElementById("hash-connect-disconnect-btn")!.onclick = closeModalDisconnect;
    }

  closeModal();
};
