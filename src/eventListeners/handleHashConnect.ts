import { closeModal, closeModalDisconnect } from "../utils/modal";

export default function handleHashConnect(
    data: { address: string; accessToken: string; refreshToken: string },
    setToken: (accessToken: string, refreshToken: string) => void,
    onDisconnect: () => void
) {

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
        const content = `<button id="hash-connect-disconnect-btn">DISCONNECT</button>`;
        profileWrapper.innerHTML = content;
        if (window.location.pathname !== '/panel.html') {
            window.location.href = '/panel.html';
        }
        document.getElementById("hash-connect-disconnect-btn")!.onclick =
            () => {
                closeModalDisconnect();
                onDisconnect();
                window.location.href = '/index.html';
            };
    }

    closeModal();
}
