let refreshPromise = null;

async function apiFetch(url, options = {}) {
    const fetchOptions = {
        ...options,
        credentials: "include"
    };

    let response = await fetch(url, fetchOptions);

    if (response.status === 401 && !options._retry) {
        console.log("[AUTH] Access token expiré — rafraîchissement en cours...");

        if (!refreshPromise) {
            refreshPromise = fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include"
            }).finally(() => {
                refreshPromise = null;
            });
        }

        const refreshResponse = await refreshPromise;

        if (refreshResponse.ok) {
            console.log("[AUTH] Rafraîchissement réussi — rejeu de la requête initiale");
            return apiFetch(url, { ...options, _retry: true });
        }

        console.log("[AUTH] Rafraîchissement échoué — redirection vers login");
        window.location.href = "/login.html";
        return response;
    }

    return response;
}

async function loadProfile() {
    const section = document.getElementById("profileSection");

    try {
        const response = await apiFetch("/api/user/me");

        if (!response.ok) {
            section.innerHTML = "<p>Session expirée</p>";
            return;
        }

        const user = await response.json();
        section.innerHTML = `
            <h2>Profil</h2>
            <p><strong>ID :</strong> ${user.id}</p>
            <p><strong>Utilisateur :</strong> ${user.username}</p>
            <p><strong>2FA :</strong> ${user.is2FAVerified ? "Validée" : "Non validée"}</p>
        `;
    } catch {
        section.innerHTML = "<p>Erreur de chargement</p>";
    }
}

document.getElementById("refreshProfileBtn").addEventListener("click", loadProfile);

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
    });
    window.location.href = "/login.html";
});

document.getElementById("batmobileBtn").addEventListener("click", async () => {
    const response = await apiFetch("/api/user/secret-batmobile");

    if (response.status === 403) {
        document.getElementById("twoFASection").classList.remove("hidden");
        return;
    }

    if (response.ok) {
        const data = await response.json();
        document.getElementById("batmobileSection").classList.remove("hidden");
        document.getElementById("batmobileData").textContent = JSON.stringify(data, null, 2);
    }
});

document.getElementById("verify2FABtn").addEventListener("click", async () => {
    const code = document.getElementById("twoFACode").value;

    const response = await apiFetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
    });

    if (response.ok) {
        document.getElementById("twoFASection").classList.add("hidden");
        await loadProfile();
        document.getElementById("batmobileBtn").click();
    } else {
        const data = await response.json();
        alert(data.error || "Code invalide");
    }
});

document.getElementById("changePasswordForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const messageEl = document.getElementById("passwordMessage");

    const response = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await response.json();
    messageEl.classList.remove("hidden", "error", "success");
    messageEl.classList.add(response.ok ? "success" : "error");
    messageEl.textContent = data.message || data.error;

    if (response.ok) {
        document.getElementById("changePasswordForm").reset();
    }
});

loadProfile();
