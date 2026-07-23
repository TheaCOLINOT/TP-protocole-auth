async function loadProfile() {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (!res.ok) {
        window.location.href = "/login.html";
        return;
    }

    const { user } = await res.json();
    document.getElementById("userName").textContent = user.name || "Sans nom";
    document.getElementById("userEmail").textContent = user.email || "";
    document.getElementById("userSub").textContent = `sub (Google) : ${user.googleId}`;

    if (user.picture) {
        const avatar = document.getElementById("avatar");
        avatar.src = user.picture;
        avatar.classList.remove("hidden");
    }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "/login.html";
});

loadProfile().catch(() => {
    window.location.href = "/login.html";
});
