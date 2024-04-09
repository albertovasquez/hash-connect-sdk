export default () => {
    console.log("client-hash-pass-verify");
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
