import "./styles.css";
import { loadScript } from "./utils/loadScript"; // Ensure this is used if necessary, else remove it.
import UserAgent from "./domains/UserAgent";

// Function to create and append a profile div to the wrapper
function createProfileDiv(wrapper: HTMLElement) {
  const div = document.createElement("div");
  div.id = "hash-connect-profile";
  wrapper.appendChild(div);
}

// Function to create and append a button to the wrapper
function createConnectButton(wrapper: HTMLElement) {
  const button = document.createElement("button");
  button.id = "hash-connect-btn";
  button.textContent = "OPEN HASH";
  button.addEventListener("click", async () => {
    // Safely accessing HASHConnect.connect using optional chaining
    window.HASHConnect?.connect?.();
  });
  wrapper.appendChild(button);
  return button;
}

// Main function to add elements to the DOM
function addElements() {
  const hashConnectWrapper = document.getElementById("hash-connect");
  if (!hashConnectWrapper) return; // Early return if the wrapper is not found

  createProfileDiv(hashConnectWrapper);
  const btn = createConnectButton(hashConnectWrapper);
  if (!localStorage.getItem("hc:sessionId")) {
    btn.style.display = "block";
  }
}

// Execute the main function to add elements
addElements();

// Initialize or add the HASHConnect property on the window object
window.HASHConnect = window.HASHConnect || UserAgent;
