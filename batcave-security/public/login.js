document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.classList.add("hidden");

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorMessage.textContent = data.error || "Erreur de connexion";
            errorMessage.classList.remove("hidden");
            return;
        }

        window.location.href = "/dashboard.html";
    } catch {
        errorMessage.textContent = "Impossible de contacter le serveur";
        errorMessage.classList.remove("hidden");
    }
});
