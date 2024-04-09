import { isExpired, parseJwt } from "../utils/jwt";

export default (data: { address: string; token: string }) => {
    console.log("client-hash-pass-verify");

    console.log({
        token: parseJwt(data.token),
        isExpired: isExpired(data.token),
    });
    // Está conectado y se muestra el panel administrativo

    const btn = document.getElementById("hash-connect-btn");
    if (btn) {
        btn.style.display = "none";
    }
    const profileWrapper = document.getElementById("hash-connect-profile");
    if (profileWrapper) {
        profileWrapper.innerHTML = window.HASHConnect.userProfile.address!;
    }
};
