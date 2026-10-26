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
  const filtersOverlay = document.getElementById("filters-overlay");
  const openFilterButtons = document.querySelectorAll("[data-open-filters]");
  const closeFilterButtons = document.querySelectorAll("[data-close-filters]");
  const body = document.body;

  if (!grid) {
    return;
  }

  const toggleFilters = (shouldOpen) => {
    if (!filtersOverlay) return;
    filtersOverlay.classList.toggle("is-visible", shouldOpen);
    body.classList.toggle("has-drawer", shouldOpen);
    filtersOverlay.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    if (shouldOpen) {
      const firstInput = filterForm?.querySelector("input");
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 150);
      }
    }
  };

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

      const members = Array.isArray(artist.members) ? artist.members : [];
      const concerts = Array.isArray(artist.concerts) ? artist.concerts : [];
      const memberPreview = members.slice(0, 3).map((member) => `<span>${member}</span>`).join("");
      const extraMembers = members.length > 3 ? `<span>+${members.length - 3}</span>` : "";
      const isFavorite = artist.isFavorite;
      const favClass = isFavorite ? "fas fa-star" : "far fa-star";
      const favActive = isFavorite ? "active" : "";

      const uniqueCities = new Set(
        concerts.map((concert) => concert.displayLocation || "Lieu non renseigné")
      ).size;
      const concertsCount = concerts.reduce((total, concert) => {
        const dates = Array.isArray(concert.dates) ? concert.dates : [];
        return total + dates.length;
      }, 0);

      card.innerHTML = `
        <div class="artist-card__visual">
          <img src="${artist.name === "Mamonas Assassinas" ? "/assets/pictures/cover.png" : artist.image}" alt="${artist.name}">
          <button class="favorite-btn ${favActive}" data-id="${artist.id}" title="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
            <i class="${favClass}"></i>
          </button>
        </div>
        <div class="artist-card__content">
          <div class="artist-card__topline">
            <div>
              <p class="artist-card__eyebrow">Fondé en ${artist.creationDate}</p>
              <h3>${artist.name}</h3>
            </div>
            <span class="artist-card__badge">${artist.members.length} membre(s)</span>
          </div>
          <p class="artist-card__lede">1er album ${artist.firstAlbum}</p>
          <div class="artist-card__tags">
            ${memberPreview}${extraMembers}
          </div>
          <div class="artist-card__stats">
            <div>
              <span>Villes suivies</span>
              <strong>${uniqueCities}</strong>
            </div>
            <div>
              <span>Concerts listés</span>
              <strong>${concertsCount}</strong>
            </div>
          </div>
          <div class="artist-card__actions">
            <span>${uniqueCities} lieu(x) cartographié(s)</span>
            <a class="ghost-btn" href="/artist?id=${artist.id}" onclick="event.preventDefault(); window.location.href='/artist?id=${artist.id}'">Voir la fiche</a>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const artistId = parseInt(btn.dataset.id);
        const icon = btn.querySelector('i');
        const isFav = btn.classList.contains('active');
        const action = isFav ? 'remove' : 'add';
        
        try {
          const response = await fetch('/api/user/favorite', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ artistId, action })
          });
          
          if (response.ok) {
            btn.classList.toggle('active');
            if (action === 'add') {
              icon.classList.remove('far');
              icon.classList.add('fas');
              btn.title = 'Retirer des favoris';
            } else {
              icon.classList.remove('fas');
              icon.classList.add('far');
              btn.title = 'Ajouter aux favoris';
            }
          } else if (response.status === 401) {
            window.location.href = '/login';
          } else {
            console.error('Erreur lors de la mise à jour des favoris');
          }
        } catch (error) {
          console.error('Erreur:', error);
        }
      });
    });

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
      toggleFilters(false);
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
    
    const headerHeight = 80;
    const extraOffset = 40;
    const cardPosition = card.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = cardPosition - headerHeight - extraOffset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });
    
    setTimeout(() => card.classList.remove("is-highlighted"), 2500);
  };

  const buildSuggestions = (query) => {
    const needle = query.toLowerCase();
    const matches = [];
    state.raw.forEach((artist) => {
      const members = Array.isArray(artist.members) ? artist.members : [];
      const concerts = Array.isArray(artist.concerts) ? artist.concerts : [];
      const artistMeta = `Créé en ${artist.creationDate} • 1er album ${artist.firstAlbum}`;

      if (artist.name.toLowerCase().includes(needle)) {
        matches.push({ label: artist.name, type: "Artiste", meta: artistMeta, id: artist.id });
      }
      members.forEach((member) => {
        if (member.toLowerCase().includes(needle)) {
          matches.push({
            label: member,
            type: "Membre",
            meta: `Appartient à ${artist.name}`,
            id: artist.id,
          });
        }
      });
      if (`${artist.creationDate}`.includes(needle)) {
        matches.push({
          label: artist.name,
          type: "Création",
          meta: `Fondé en ${artist.creationDate}`,
          id: artist.id,
        });
      }
      concerts.forEach((concert) => {
        const locationName = (concert.displayLocation || "").toLowerCase();
        if (!locationName) return;
        if (locationName.includes(needle)) {
          const dateSample = (concert.dates && concert.dates[0]) || "Dates non précisées";
          matches.push({
            label: concert.displayLocation,
            type: "Lieu",
            meta: `${artist.name} • ${dateSample}`,
            id: artist.id,
          });
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
      li.innerHTML = `
        <div class="suggestion-text">
          <strong>${item.label}</strong>
          <small>${item.meta || ""}</small>
        </div>
        <span class="suggestion-type">${item.type}</span>
      `;
      li.addEventListener("click", () => {
        scrollToCard(item.id);
        suggestions.innerHTML = "";
        suggestions.classList.remove("is-open");
      });
      fragment.appendChild(li);
    });
    suggestions.appendChild(fragment);
  };

  // Debounce pour optimiser la recherche
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
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

  const debouncedSearch = debounce(handleSearch, 150);

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
      setTimeout(() => {
        resetFilters();
        toggleFilters(false);
      }, 0);
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", debouncedSearch);
    searchInput.addEventListener("keydown", handleSearchEnter);
  }

  if (filtersOverlay) {
    openFilterButtons.forEach((btn) => btn.addEventListener("click", () => toggleFilters(true)));
    closeFilterButtons.forEach((btn) => btn.addEventListener("click", () => toggleFilters(false)));
    filtersOverlay.addEventListener("click", (event) => {
      if (event.target === filtersOverlay) {
        toggleFilters(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && filtersOverlay.classList.contains("is-visible")) {
        toggleFilters(false);
      }
    });
  }

  renderCards(state.raw);
});

