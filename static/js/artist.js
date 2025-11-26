document.addEventListener("DOMContentLoaded", () => {
  const target = document.getElementById("artist-map");
  const artist = window.__ARTIST;
  if (!target || !artist) return;

  if (typeof L === "undefined") {
    target.classList.add("map--empty");
    target.innerHTML = "<p>Leaflet n'a pas pu être chargé. Merci de rafraîchir.</p>";
    return;
  }

  const map = L.map(target, {
    zoomControl: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  const bounds = [];

  artist.concerts.forEach((concert) => {
    if (!concert.coordinates) return;
    const { lat, lng } = concert.coordinates;
    bounds.push([lat, lng]);
    const popupDates = (concert.dates || []).join("<br>");
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<strong>${concert.displayLocation}</strong><br>${popupDates}`);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [40, 40] });
  } else {
    map.setView([20, 0], 2);
    target.classList.add("map--empty");
    const overlay = document.createElement("div");
    overlay.className = "map-empty-message";
    overlay.innerHTML = "<p>Aucune coordonnée n'a pu être chargée pour ces concerts.</p>";
    target.appendChild(overlay);
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 200);
});

