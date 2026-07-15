const body = document.body;
const statusLabel = document.querySelector(".status-label");
const stateCopy = document.querySelector(".state-copy");
const primaryButton = document.querySelector(".primary-button");
const homepageURL = document.querySelector(".homepage-url");
const toast = document.querySelector(".toast");
let extensionEnabled = null;
let toastTimer;

function post(action) {
    window.webkit.messageHandlers.controller.postMessage(action);
}

function show(enabled, useSettingsInsteadOfPreferences, url) {
    extensionEnabled = typeof enabled === "boolean" ? enabled : null;
    body.classList.toggle("state-on", extensionEnabled === true);
    body.classList.toggle("state-off", extensionEnabled === false);
    body.classList.toggle("state-unknown", extensionEnabled === null);

    if (url) homepageURL.textContent = url;

    if (extensionEnabled === true) {
        statusLabel.textContent = "Extension on";
        stateCopy.textContent = "Pulse is enabled and ready to replace new Safari tabs.";
        primaryButton.textContent = "Open Pulse in Safari";
    } else if (extensionEnabled === false) {
        statusLabel.textContent = "Extension off";
        stateCopy.textContent = `Enable Pulse in Safari ${useSettingsInsteadOfPreferences ? "Settings" : "Preferences"} to use it on new tabs.`;
        primaryButton.textContent = "Enable in Safari";
    } else {
        statusLabel.textContent = "Check extension";
        stateCopy.textContent = "Open Safari Settings to confirm Pulse is enabled.";
        primaryButton.textContent = "Open Pulse in Safari";
    }
}

function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.setAttribute("aria-hidden", "false");
    toast.classList.add("visible");
    toastTimer = setTimeout(() => {
        toast.classList.remove("visible");
        toast.setAttribute("aria-hidden", "true");
    }, 2600);
}

primaryButton.addEventListener("click", () => post(extensionEnabled === false ? "open-preferences" : "open-pulse"));
document.querySelector(".open-preferences").addEventListener("click", () => post("open-preferences"));
document.querySelector(".copy-button").addEventListener("click", () => post("copy-url"));
