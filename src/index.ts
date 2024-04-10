import "./styles.css";
import { loadScript } from "./utils/loadScript";
import UserAgent from "./domains/UserAgent";

const addElements = () => {
    const hashConnectWrapper = document.getElementById("hash-connect");

    const div = document.createElement("div");
    div.id = "hash-connect-profile";
    hashConnectWrapper?.appendChild(div);

    const button = document.createElement("button");
    button.id = "hash-connect-btn";
    button.textContent = "Open HASH";
    button.addEventListener("click", async () => {
        if (window?.HASHConnect?.connect) window.HASHConnect.connect();
    });
    hashConnectWrapper?.appendChild(button);
};

// Add or initialize the HASHConnect property on the window object
window.HASHConnect = window.HASHConnect || UserAgent;

addElements();
