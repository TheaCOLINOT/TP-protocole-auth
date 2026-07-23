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

function showResult(data) {
    const section = document.getElementById("resultSection");
    section.classList.remove("hidden");
    document.getElementById("resultData").textContent = JSON.stringify(data, null, 2);
}

async function loadProfile() {
    const section = document.getElementById("profileSection");

    try {
        const response = await apiFetch("/api/user/me");

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            section.innerHTML = `<p>${data.error || "Session expirée"}</p>`;
            if (response.status === 401) {
                window.location.href = "/login.html";
            }
            return;
        }

        const user = await response.json();
        section.innerHTML = `
            <h2>Profil</h2>
            <p><strong>ID :</strong> ${user.id}</p>
            <p><strong>Utilisateur :</strong> ${user.username}</p>
            <p><strong>2FA :</strong> ${user.two_factor_enabled ? "Activée" : "Désactivée"}</p>
            <p><strong>Scopes :</strong> ${(user.scopes || []).join(", ") || "aucun"}</p>
        `;
    } catch {
        section.innerHTML = "<p>Erreur de chargement</p>";
    }
}

async function callProtected(url) {
    const response = await apiFetch(url);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        showResult({ status: response.status, ...data });
        return;
    }

    showResult(data);
}

document.getElementById("refreshProfileBtn").addEventListener("click", loadProfile);

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
    });
    window.location.href = "/login.html";
});

document.getElementById("batmobileBtn").addEventListener("click", () => {
    callProtected("/api/user/secret-batmobile");
});

document.getElementById("batmobileStatusBtn").addEventListener("click", () => {
    callProtected("/api/user/batmobile-status");
});

document.getElementById("armoryBtn").addEventListener("click", () => {
    callProtected("/api/user/armory");
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
