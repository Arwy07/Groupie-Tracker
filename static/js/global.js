document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refresh-btn");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      if (refreshButton.disabled) return;
      const original = refreshButton.textContent;
      refreshButton.disabled = true;
      refreshButton.classList.add("is-loading");
      refreshButton.textContent = "Mise à jour...";
      try {
        const endpoint = refreshButton.dataset.endpoint || "/api/refresh";
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        refreshButton.textContent = "Données fraîches ✨";
      } catch (err) {
        console.error(err);
        refreshButton.textContent = "Erreur, réessaie";
        refreshButton.classList.add("is-error");
      } finally {
        setTimeout(() => {
          refreshButton.disabled = false;
          refreshButton.classList.remove("is-loading", "is-error");
          refreshButton.textContent = original;
        }, 2000);
      }
    });
  }
});

