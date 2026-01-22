let concertsMapInitialized = false;

function initConcertsMap() {
    if (concertsMapInitialized || window.concertsMap) {
        return;
    }
    
    const mapContainer = document.getElementById('concerts-map');
    if (!mapContainer) return;
    
    if (typeof L === 'undefined') {
        showMapError('Leaflet non disponible');
        return;
    }
    
    concertsMapInitialized = true;
    
    if (mapContainer.offsetHeight === 0 || mapContainer.offsetWidth === 0) {
        setTimeout(() => { concertsMapInitialized = false; initConcertsMap(); }, 100);
        return;
    }
    
    // Créer la carte
    const map = L.map('concerts-map', {
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        center: [20, 0],
        zoom: 3,
        minZoom: 3,
        maxZoom: 18,
        worldCopyJump: false
    });
    
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    // CartoDB comme fond
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    const markers = [];
    const bounds = [];
    const artists = window.__ARTISTS || [];
    let validCount = 0;
    
    function getUpcomingDates(dates) {
        if (!dates || dates.length === 0) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return dates.filter(dateStr => {
            try {
                const [day, month, year] = dateStr.split('-').map(Number);
                const fullYear = year < 100 ? 2000 + year : year;
                const concertDate = new Date(fullYear, month - 1, day);
                return concertDate >= today;
            } catch { return false; }
        }).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('-').map(Number);
            const [dayB, monthB, yearB] = b.split('-').map(Number);
            return new Date(2000 + yearA, monthA - 1, dayA) - new Date(2000 + yearB, monthB - 1, dayB);
        });
    }
    
    function isUpcoming(dates) {
        if (!dates || dates.length === 0) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dates.some(dateStr => {
            try {
                const [day, month, year] = dateStr.split('-').map(Number);
                const fullYear = year < 100 ? 2000 + year : year;
                return new Date(fullYear, month - 1, day) >= today;
            } catch { return false; }
        });
    }
    
    function createPopup(concert, artist) {
        const allDates = concert.dates || [];
        
        // Debug: vérifier les données de l'artiste
        console.log('Artist data:', artist.name, 'Image:', artist.image);
        
        // Préparer les données pour les boutons
        const artistData = encodeURIComponent(JSON.stringify({
            id: artist.id,
            name: artist.name,
            image: artist.image,
            members: artist.members || [],
            creationDate: artist.creationDate,
            firstAlbum: artist.firstAlbum,
            concerts: artist.concerts || []
        }));
        
        const concertData = encodeURIComponent(JSON.stringify({
            location: concert.displayLocation || 'Lieu inconnu',
            dates: allDates,
            coordinates: concert.coordinates
        }));
        
        const datesList = allDates.length > 0
            ? `<div class="popup-dates"><strong><i class="fas fa-calendar-alt"></i> Dates :</strong><ul>${allDates.slice(0, 4).map(d => `<li>${d}</li>`).join('')}${allDates.length > 4 ? `<li class="more">+${allDates.length - 4} autre(s)</li>` : ''}</ul></div>`
            : '<p class="no-dates"><i class="fas fa-calendar-times"></i> Aucune date</p>';
        
        const members = artist.members?.length > 0
            ? `<div class="popup-members"><i class="fas fa-users"></i> ${artist.members.slice(0, 3).join(', ')}${artist.members.length > 3 ? '...' : ''}</div>`
            : '';
        
        return `
            <div class="concert-popup enhanced">
                <div class="popup-header">
                    <img src="${artist.image}" alt="${artist.name}" class="popup-artist-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23a855f7%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2220%22%3E${artist.name.charAt(0)}%3C/text%3E%3C/svg%3E'">
                    <div class="popup-artist-info">
                        <h4>${artist.name}</h4>
                        <p class="popup-location"><i class="fas fa-map-marker-alt"></i> <strong>${concert.displayLocation || 'Lieu inconnu'}</strong></p>
                    </div>
                </div>
                <div class="popup-details">
                    <div class="popup-meta">
                        <span><i class="fas fa-calendar"></i> Créé en ${artist.creationDate}</span>
                        <span><i class="fas fa-compact-disc"></i> Album: ${artist.firstAlbum}</span>
                    </div>
                    ${members}
                    ${datesList}
                    <div class="popup-actions-enhanced">
                        <button class="popup-btn secondary" onclick="openArtistDetailsFromMap('${artistData}')">
                            <i class="fas fa-info-circle"></i> Détails
                        </button>
                        <button class="popup-btn primary buy-ticket-btn" onclick="buyTicketFromMap('${artistData}', '${concertData}')">
                            <i class="fas fa-ticket-alt"></i> Acheter
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Charger TOUS les marqueurs INSTANTANÉMENT (sans appel API)
    for (const artist of artists) {
        if (!artist.concerts || !Array.isArray(artist.concerts)) continue;
        
        for (const concert of artist.concerts) {
            let lat, lng;
            
            // Lire les coordonnées pré-calculées
            if (concert.coordinates) {
                if (concert.coordinates.lat !== undefined && concert.coordinates.lng !== undefined) {
                    lat = parseFloat(concert.coordinates.lat);
                    lng = parseFloat(concert.coordinates.lng);
                } else if (concert.coordinates.latitude !== undefined && concert.coordinates.longitude !== undefined) {
                    lat = parseFloat(concert.coordinates.latitude);
                    lng = parseFloat(concert.coordinates.longitude);
                }
            }
            
            // Ignorer si pas de coordonnées
            if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) continue;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
            
            validCount++;
            const upcoming = isUpcoming(concert.dates);
            
            const markerIcon = L.divIcon({
                className: 'custom-marker-wrapper',
                html: `<div class="custom-marker ${upcoming ? 'upcoming' : 'past'}">
                    <div class="marker-pin">
                        <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="currentColor"/>
                            <circle cx="12" cy="12" r="5" fill="white"/>
                        </svg>
                    </div>
                </div>`,
                iconSize: [28, 36],
                iconAnchor: [14, 36],
                popupAnchor: [0, -36]
            });
            
            const marker = L.marker([lat, lng], {
                icon: markerIcon,
                title: artist.name + ' - ' + (concert.displayLocation || 'Lieu inconnu')
            });
            
            marker.bindPopup(createPopup(concert, artist), {
                maxWidth: 400,
                minWidth: 300,
                className: 'concert-popup-wrapper',
                closeButton: true,
                autoClose: false,
                closeOnClick: false
            });
            
            marker.on('click', () => marker.openPopup());
            marker.addTo(map);
            markers.push(marker);
            bounds.push([lat, lng]);
        }
    }
    
    // Ajuster la vue
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
    
    console.log(`✅ Carte des concerts: ${validCount} marqueurs affichés`);
    
    // Resize handler
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            map.invalidateSize();
            if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
        }, 250);
    });
    
    window.concertsMap = map;
    window.concertsMarkers = markers;
    
    function showMapError(message) {
        if (!mapContainer) return;
        mapContainer.innerHTML = `
            <div class="error-message" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(10, 14, 26, 0.9); color: var(--text); padding: 2rem; text-align: center; z-index: 1000;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <p style="margin: 0 0 1rem; font-size: 1.1rem;">${message}</p>
                <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer;">Recharger</button>
            </div>
        `;
    }
}

// Initialiser quand prêt
function initializeConcertsMapWhenReady() {
    const mapContainer = document.getElementById('concerts-map');
    if (!mapContainer) {
        setTimeout(initializeConcertsMapWhenReady, 500);
        return;
    }
    
    if (typeof waitForLeaflet !== 'undefined') {
        waitForLeaflet(() => initConcertsMap());
    } else {
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof L !== 'undefined' && typeof L.map === 'function') {
                clearInterval(checkInterval);
                setTimeout(() => initConcertsMap(), 100);
            } else if (attempts >= 100) {
                clearInterval(checkInterval);
            }
        }, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConcertsMapWhenReady);
} else {
    initializeConcertsMapWhenReady();
}

// Styles CSS
const style = document.createElement('style');
style.textContent = `
    #concerts-map {
        width: 100% !important;
        height: 500px !important;
        min-height: 500px !important;
        position: relative !important;
        border-radius: 16px;
    }
    
    .custom-marker { cursor: pointer; transition: transform 0.2s ease; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); }
    .marker-pin { width: 100%; height: 100%; }
    .marker-pin svg { width: 100%; height: 100%; }
    .custom-marker.upcoming .marker-pin { color: #8b5cf6; filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6)); }
    .custom-marker.past .marker-pin { color: #6b7280; filter: drop-shadow(0 0 4px rgba(107, 114, 128, 0.4)); }
    .custom-marker:hover { transform: scale(1.3) translateY(-4px); z-index: 1000 !important; }
    
    .concert-popup-wrapper .leaflet-popup-content-wrapper { background: var(--panel, #1a1f2e); color: var(--text, #e8ecf0); border-radius: 16px; border: 1px solid var(--border, rgba(156, 163, 175, 0.15)); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); padding: 0; }
    .concert-popup-wrapper .leaflet-popup-content { margin: 0; padding: 0; }
    .concert-popup-wrapper .leaflet-popup-tip { background: var(--panel, #1a1f2e); }
    
    .concert-popup { padding: 1rem; }
    .popup-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border, rgba(156, 163, 175, 0.15)); }
    .popup-artist-image { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; }
    .popup-artist-info h4 { margin: 0 0 0.25rem; font-size: 1.1rem; color: var(--accent, #a855f7); }
    .popup-location { margin: 0; font-size: 0.9rem; color: var(--text, #e8ecf0); }
    .popup-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.85rem; color: var(--muted, #9ca3af); }
    .popup-dates ul { margin: 0.5rem 0 0; padding-left: 1.5rem; }
    .popup-dates li { margin: 0.25rem 0; }
    .popup-actions { margin-top: 1rem; }
    .btn-popup { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--accent, #a855f7); color: white; border-radius: 8px; text-decoration: none; font-size: 0.9rem; }
    .btn-popup:hover { background: var(--accent-2, #7c3aed); }
`;
document.head.appendChild(style);

