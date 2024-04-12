import { closeModal, closeModalDisconnect } from "../utils/modal";

export default function handleHashConnect(
    data: { address: string; accessToken: string; refreshToken: string },
    setToken: (accessToken: string, refreshToken: string) => void,
    onDisconnect: () => void
) {
    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

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
        const content = `<div id="hash-connect-disconnect-div">
                           <span id="hash-connect-disconnect-span">${formatAddress(
                               data.address
                           )}</span>
                           <button id="hash-connect-disconnect-btn">Disconnect</button>
                         </div>`;
        profileWrapper.innerHTML = content;

        document.getElementById("hash-connect-disconnect-btn")!.onclick =
            () => {
                closeModalDisconnect();
                onDisconnect();
            };
    }

    closeModal();
}
