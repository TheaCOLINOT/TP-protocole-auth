const loginForm = document.getElementById("loginForm");
const totpSection = document.getElementById("totpSection");
const setupSection = document.getElementById("setupSection");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

let pendingUsername = "";

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    successMessage.classList.add("hidden");
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove("hidden");
    errorMessage.classList.add("hidden");
}

function clearMessages() {
    errorMessage.classList.add("hidden");
    successMessage.classList.add("hidden");
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    pendingUsername = username;

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.status === 403 && data.requires2FASetup) {
            loginForm.classList.add("hidden");
            totpSection.classList.add("hidden");
            setupSection.classList.remove("hidden");
            showError(data.error);
            return;
        }

        if (response.ok && data.requires2FA) {
            loginForm.classList.add("hidden");
            setupSection.classList.add("hidden");
            totpSection.classList.remove("hidden");
            showSuccess(data.message || "Code 2FA requis");
            document.getElementById("totpCode").focus();
            return;
        }

        if (!response.ok) {
            showError(data.error || "Erreur de connexion");
            return;
        }

        window.location.href = "/dashboard.html";
    } catch {
        showError("Impossible de contacter le serveur");
    }
});

document.getElementById("verifyTotpBtn").addEventListener("click", async () => {
    clearMessages();
    const code = document.getElementById("totpCode").value.trim();

    try {
        const response = await fetch("/api/verify-2fa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username: pendingUsername, code })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || "Code invalide");
            return;
        }

        window.location.href = "/dashboard.html";
    } catch {
        showError("Impossible de contacter le serveur");
    }
});

document.getElementById("startSetupBtn").addEventListener("click", async () => {
    clearMessages();

    try {
        const response = await fetch("/api/auth/2fa/setup", {
            method: "POST",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || "Échec de l'initialisation 2FA");
            return;
        }

        const qrImage = document.getElementById("qrImage");
        qrImage.src = data.qrCode;
        qrImage.classList.remove("hidden");

        const secretBackup = document.getElementById("secretBackup");
        secretBackup.textContent = `Secret de secours : ${data.secret}`;
        secretBackup.classList.remove("hidden");

        showSuccess(data.message);
    } catch {
        showError("Impossible de générer le QR code");
    }
});

document.getElementById("confirmSetupBtn").addEventListener("click", async () => {
    clearMessages();
    const code = document.getElementById("setupCode").value.trim();

    try {
        const response = await fetch("/api/auth/2fa/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username: pendingUsername, code })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || "Confirmation échouée");
            return;
        }

        showSuccess(data.message);
        setupSection.classList.add("hidden");
        loginForm.classList.remove("hidden");
        document.getElementById("password").value = "";
    } catch {
        showError("Impossible de confirmer la 2FA");
    }
});
