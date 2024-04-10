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
        profileWrapper.innerHTML = "";

        const div = document.createElement("div");
        div.id = "hash-connect-disconnect-div";
        profileWrapper.appendChild(div);

        const span = document.createElement("span");
        span.textContent = formatAddress(data.address);
        span.id = "hash-connect-disconnect-span";
        div.appendChild(span);

        const button = document.createElement("button");
        button.textContent = "Disconnect";
        button.id = "hash-connect-disconnect-btn";
        button.onclick = () => {
            closeModalDisconnect();
        };
        div.appendChild(button);
    }

    closeModal();
};
