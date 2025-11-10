import "./styles.css";
import UserAgent from "./domains/UserAgent";
import translation from "./utils/translation";
import { storage } from "./utils/storage";
import { logError, logWarn } from "./config";

// Function to create and append a profile div to the wrapper
function createProfileDiv(wrapper: HTMLElement) {
    try {
        const div = document.createElement("div");
        div.id = "hash-connect-profile";
        wrapper.appendChild(div);
    } catch (error) {
        logError("Error creating profile div:", error);
    }
}

// Function to create and append a button to the wrapper
function createConnectButton(wrapper: HTMLElement) {
    try {
        const button = document.createElement("button");
        button.id = "hash-connect-btn";
        const span = document.createElement("span");
        span.id = "hash-connect-btn-span";
        span.textContent = translation.translate("connect");
        button.appendChild(span);
        button.addEventListener("click", async () => {
            try {
                // Safely accessing HASHConnect.connect using optional chaining
                if (window.HASHConnect && typeof window.HASHConnect.connect === 'function') {
                    window.HASHConnect.connect();
                } else {
                    logError("HASHConnect.connect is not available");
                }
            } catch (error) {
                logError("Error handling connect button click:", error);
            }
        });
        wrapper.appendChild(button);
        return button;
    } catch (error) {
        logError("Error creating connect button:", error);
        return null;
    }
}

// Main function to add elements to the DOM
function addElements() {
    try {
        const hashConnectWrapper = document.getElementById("hash-connect");
        if (!hashConnectWrapper) {
            logWarn("hash-connect element not found in the DOM");
            return; // Early return if the wrapper is not found
        }

        createProfileDiv(hashConnectWrapper);
        const btn = createConnectButton(hashConnectWrapper);
        
        if (btn) {
            // logic to show button
            const hasSession = storage.getItem("hc:sessionId");
            const hasUser = storage.getItem("hc:address");
            if (!hasSession || (hasSession && !hasUser)) {
                btn.style.display = "block";
            }
        }
    } catch (error) {
        logError("Error in addElements:", error);
    }
}

// Execute the main function to add elements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addElements);
} else {
    addElements();
}

// Initialize or add the HASHConnect property on the window object
window.HASHConnect = window.HASHConnect || UserAgent;
