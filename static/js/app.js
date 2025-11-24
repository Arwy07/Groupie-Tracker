const state = {
  raw: window.__ARTISTS || [],
  displayed: [],
};

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("artists");
  const filterForm = document.getElementById("filter-form");
  const suggestions = document.getElementById("suggestions");
  const searchInput = document.getElementById("search-input");
  const total = document.getElementById("total-artists");

  if (!grid || !state.raw.length) {
    return;
  }

  const renderCards = (artists) => {
    state.displayed = artists;
    grid.innerHTML = "";
    if (!artists.length) {
      grid.innerHTML = `<div class="empty">
        <p>Aucun artiste ne correspond à ces critères.</p>
        <p>Essayez d'élargir la plage ou de retirer un lieu.</p>
      </div>`;
      updateTotal(0);
      return;
    }

    const fragment = document.createDocumentFragment();
    artists.forEach((artist, index) => {
      const card = document.createElement("article");
      card.className = "artist-card";
      card.dataset.id = artist.id;
      card.style.setProperty("--delay", `${index * 40}ms`);
      card.innerHTML = `
        <div class="artist-card__media">
          <img src="${artist.image}" alt="${artist.name}">
        </div>
        <div class="artist-card__body">
          <div class="artist-card__header">
            <h3>${artist.name}</h3>
            <span>${artist.creationDate}</span>
          </div>
          <p class="artist-card__meta">${artist.members.length} membre(s) • 1er album ${artist.firstAlbum}</p>
          <div class="pill-group">
            ${artist.members.slice(0, 3).map((member) => `<span>${member}</span>`).join("")}
            ${artist.members.length > 3 ? `<span>+${artist.members.length - 3} autres</span>` : ""}
          </div>
          <div class="artist-card__footer">
            <span>${artist.concerts.length} lieu(x) référencés</span>
            <a class="ghost-btn" href="/artist?id=${artist.id}">Voir la carte</a>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    updateTotal(artists.length);
  };

  const updateTotal = (count) => {
    if (total) {
      total.textContent = `${count} artiste(s) visibles`;
    }
  };

  const applyFilters = async (event) => {
    event.preventDefault();
    const formData = new FormData(filterForm);
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      if (value) {
        params.append(key, value);
      }
    });
    filterForm.classList.add("is-loading");
    try {
      const response = await fetch(`/api/filter?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      renderCards(data);
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="empty">
        <p>Une erreur est survenue.</p>
        <p>Merci de réessayer.</p>
      </div>`;
    } finally {
      filterForm.classList.remove("is-loading");
    }
  };

  const resetFilters = () => {
    renderCards(state.raw);
  };

  const scrollToCard = (id) => {
    const card = grid.querySelector(`[data-id="${id}"]`);
    if (!card) return;
    grid.querySelectorAll(".artist-card").forEach((el) => el.classList.remove("is-highlighted"));
    card.classList.add("is-highlighted");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => card.classList.remove("is-highlighted"), 2500);
  };

  const buildSuggestions = (query) => {
    const needle = query.toLowerCase();
    const matches = [];
    state.raw.forEach((artist) => {
      if (artist.name.toLowerCase().includes(needle)) {
        matches.push({ label: artist.name, type: "Artiste", id: artist.id });
      }
      artist.members.forEach((member) => {
        if (member.toLowerCase().includes(needle)) {
          matches.push({ label: `${member} — membre`, type: "Membre", id: artist.id });
        }
      });
      if (`${artist.creationDate}`.includes(needle)) {
        matches.push({ label: `Création ${artist.creationDate}`, type: "Date", id: artist.id });
      }
      artist.concerts.forEach((concert) => {
        if (concert.displayLocation.toLowerCase().includes(needle)) {
          matches.push({ label: concert.displayLocation, type: "Lieu", id: artist.id });
        }
      });
    });
    return matches.slice(0, 6);
  };

  const renderSuggestions = (items) => {
    if (!suggestions) return;
    suggestions.innerHTML = "";
    if (!items.length) {
      suggestions.classList.remove("is-open");
      return;
    }
    suggestions.classList.add("is-open");
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${item.label}</span><small>${item.type}</small>`;
      li.addEventListener("click", () => {
        scrollToCard(item.id);
        suggestions.innerHTML = "";
        suggestions.classList.remove("is-open");
      });
      fragment.appendChild(li);
    });
    suggestions.appendChild(fragment);
  };

  const handleSearch = (event) => {
    if (!suggestions) return;
    const query = event.target.value.trim();
    if (!query) {
      suggestions.innerHTML = "";
      suggestions.classList.remove("is-open");
      return;
    }
    const items = buildSuggestions(query);
    renderSuggestions(items);
  };

  const handleSearchEnter = (event) => {
    if (event.key !== "Enter" || !suggestions) return;
    const firstSuggestion = suggestions.querySelector("li");
    if (firstSuggestion) {
      firstSuggestion.click();
      event.preventDefault();
    }
  };

  if (filterForm) {
    filterForm.addEventListener("submit", applyFilters);
    filterForm.addEventListener("reset", () => {
      setTimeout(resetFilters, 0);
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
    searchInput.addEventListener("keydown", handleSearchEnter);
  }

  renderCards(state.raw);
});

