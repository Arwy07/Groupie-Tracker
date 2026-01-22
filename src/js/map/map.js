let globalMapInitialized = false;

function initGlobalMap() {
    if (globalMapInitialized || window.globalMap) {
        console.warn('Carte globale déjà initialisée');
        return;
    }
    
    const mapContainer = document.getElementById('global-map');
    if (!mapContainer) {
        console.warn('Conteneur global-map introuvable');
        return;
    }
    
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas disponible');
        showMapError('Leaflet n\'a pas pu être chargé. Vérifiez votre connexion internet.');
        return;
    }
    
    globalMapInitialized = true;
    
    console.log('Initialisation de la carte globale...');
    
    if (mapContainer.offsetHeight === 0 || mapContainer.offsetWidth === 0) {
        console.warn('Conteneur de carte sans dimensions, attente...');
        setTimeout(() => initGlobalMap(), 100);
        globalMapInitialized = false;
        return;
    }
    
    // Créer la carte avec Google Maps style
    const map = L.map('global-map', {
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        fadeAnimation: false,
        zoomAnimation: true,
        attributionControl: true,
        center: [20, 0],
        zoom: 3,
        minZoom: 3,
        maxZoom: 19,
        worldCopyJump: false
    });
    
    L.control.zoom({
        position: 'topright',
        zoomInTitle: 'Zoom avant',
        zoomOutTitle: 'Zoom arrière'
    }).addTo(map);
    
    // Google Maps comme fond de carte
    const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    });
    
    // Alternative OpenStreetMap
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    });
    
    // CartoDB Voyager (style moderne)
    const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    });
    
    // Utiliser Google Maps par défaut
    googleStreets.addTo(map);
    
    // Contrôle de couches
    const baseLayers = {
        "Google Maps": googleStreets,
        "OpenStreetMap": osmLayer,
        "CartoDB": cartoLayer
    };
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);
    
    console.log('Carte Leaflet initialisée avec Google Maps');
    
    const markers = [];
    const bounds = [];
    const markerGroups = {};
    
    function createPopupContent(concert, artist) {
        const dates = concert.dates || [];
        const artistName = artist.name;
        const artistId = artist.id;
        const artistImage = artist.image;
        const members = artist.members || [];
        
        // Debug: vérifier les données de l'artiste
        console.log('Creating popup for:', artistName, 'ID:', artistId, 'Image:', artistImage);
        
        // Préparer les données pour les boutons
        const artistData = encodeURIComponent(JSON.stringify({
            id: artistId,
            name: artistName,
            image: artistImage,
            members: members,
            creationDate: artist.creationDate,
            firstAlbum: artist.firstAlbum,
            concerts: artist.concerts || []
        }));
        
        const concertData = encodeURIComponent(JSON.stringify({
            location: concert.displayLocation || 'Lieu inconnu',
            dates: dates,
            coordinates: concert.coordinates
        }));
        
        const datesList = dates.length > 0
            ? `<div class="popup-dates">
                  <strong><i class="fas fa-calendar-alt"></i> Dates :</strong>
                  <ul>${dates.slice(0, 4).map(date => `<li>${date}</li>`).join('')}${dates.length > 4 ? `<li class="more">+${dates.length - 4} autre(s)</li>` : ''}</ul>
              </div>`
            : '';
        
        const membersList = members.length > 0
            ? `<div class="popup-members"><i class="fas fa-users"></i> ${members.slice(0, 3).join(', ')}${members.length > 3 ? '...' : ''}</div>`
            : '';
        
        return `
            <div class="map-popup enhanced">
                <div class="popup-header-enhanced">
                    <img src="${artistImage}" alt="${artistName}" class="popup-artist-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23a855f7%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2224%22%3E${artistName.charAt(0)}%3C/text%3E%3C/svg%3E'">
                    <div class="popup-title-area">
                        <h4>${artistName}</h4>
                    </div>
                </div>
                <div class="popup-body">
                    <p class="location">
                        <i class="fas fa-map-marker-alt"></i>
                        <strong>${concert.displayLocation || 'Lieu inconnu'}</strong>
                    </p>
                    ${membersList}
                    ${datesList}
                </div>
                <div class="popup-actions-enhanced">
                    <button class="popup-btn secondary" onclick="openArtistDetailsFromMap('${artistData}')">
                        <i class="fas fa-info-circle"></i> Détails
                    </button>
                    <button class="popup-btn primary buy-ticket-btn" onclick="buyTicketFromMap('${artistData}', '${concertData}')">
                        <i class="fas fa-ticket-alt"></i> Acheter
                    </button>
                </div>
            </div>
        `;
    }
    
    const artists = window.__ARTISTS || [];
    let validLocationsCount = 0;
    
    console.log('Carte globale - Artistes chargés:', artists.length);
    
    // Charger TOUS les marqueurs immédiatement (sans appel API)
    function loadAllMarkersInstantly() {
        console.log('Chargement instantané des marqueurs...');
        
        for (const artist of artists) {
            if (!artist.concerts || !Array.isArray(artist.concerts)) continue;
            
            for (const concert of artist.concerts) {
                let lat, lng;
                
                // Extraire les coordonnées pré-calculées
                if (concert.coordinates) {
                    if (concert.coordinates.lat !== undefined && concert.coordinates.lng !== undefined) {
                        lat = parseFloat(concert.coordinates.lat);
                        lng = parseFloat(concert.coordinates.lng);
                    } else if (concert.coordinates.latitude !== undefined && concert.coordinates.longitude !== undefined) {
                        lat = parseFloat(concert.coordinates.latitude);
                        lng = parseFloat(concert.coordinates.longitude);
                    }
                }
                
                // Ignorer si pas de coordonnées valides
                if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
                    continue;
                }
                
                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    continue;
                }
                
                validLocationsCount++;
                const popupContent = createPopupContent(concert, artist);
                
                // Déterminer si concert à venir
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const hasUpcoming = (concert.dates || []).some(dateStr => {
                    try {
                        const [day, month, year] = dateStr.split('-').map(Number);
                        const fullYear = year < 100 ? 2000 + year : year;
                        return new Date(fullYear, month - 1, day) >= today;
                    } catch { return false; }
                });
                
                const markerIcon = L.divIcon({
                    className: `custom-marker ${hasUpcoming ? 'upcoming' : 'past'}`,
                    html: `<div class="marker-pin">
                        <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="currentColor"/>
                            <circle cx="12" cy="12" r="5" fill="white"/>
                        </svg>
                    </div>`,
                    iconSize: [28, 36],
                    iconAnchor: [14, 36],
                    popupAnchor: [0, -36]
                });
                
                const marker = L.marker([lat, lng], {
                    icon: markerIcon,
                    interactive: true,
                    keyboard: true,
                    title: artist.name + ' - ' + (concert.displayLocation || 'Lieu inconnu')
                });
                
                marker.bindPopup(popupContent, {
                    maxWidth: 300,
                    minWidth: 200,
                    className: 'custom-popup',
                    closeButton: true,
                    autoClose: false,
                    closeOnClick: false
                });
                
                marker.on('click', function(e) {
                    marker.openPopup();
                });
                
                marker.addTo(map);
                markers.push(marker);
                bounds.push([lat, lng]);
                
                if (!markerGroups[artist.id]) {
                    markerGroups[artist.id] = [];
                }
                markerGroups[artist.id].push(marker);
            }
        }
        
        // Ajuster la vue sur tous les marqueurs
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
        }
        
        console.log(`✅ Carte chargée instantanément: ${validLocationsCount} marqueurs affichés`);
        
        // Cacher le loading
        const loadingElement = mapContainer.querySelector('.map-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
    
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            map.invalidateSize();
            if (bounds.length > 0) {
                if (bounds.length === 1) {
                    map.setView(bounds[0], map.getZoom());
                } else {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }, 250);
    });
    
    window.globalMap = map;
    window.globalMarkers = markers;
    
    // Charger les marqueurs immédiatement
    map.invalidateSize();
    loadAllMarkersInstantly();
    
    function showMapError(message) {
        if (!mapContainer) return;
        console.error('Erreur de carte:', message);
        mapContainer.innerHTML = `
            <div class="error-message" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(10, 14, 26, 0.9); color: var(--text); padding: 2rem; text-align: center; z-index: 1000;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <p style="margin: 0 0 1rem; font-size: 1.1rem;">${message}</p>
                <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer;">Recharger</button>
            </div>
        `;
    }
    
    // Styles
    const style = document.createElement('style');
    style.textContent = `
        #global-map {
            width: 100% !important;
            height: 600px !important;
            min-height: 600px !important;
            position: relative !important;
            overflow: hidden !important;
            border-radius: 16px;
        }
        
        .custom-marker {
            position: relative;
            width: 28px;
            height: 36px;
            cursor: pointer;
            transition: transform 0.2s ease;
            pointer-events: auto !important;
            z-index: 100 !important;
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
        }
        
        .marker-pin {
            position: absolute;
            width: 100%;
            height: 100%;
            left: 0;
            top: 0;
            pointer-events: auto !important;
        }
        
        .marker-pin svg {
            width: 100%;
            height: 100%;
        }
        
        .custom-marker.upcoming .marker-pin {
            color: #8b5cf6;
            filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6));
        }
        
        .custom-marker:hover {
            transform: scale(1.3) translateY(-4px);
            z-index: 1000 !important;
        }

        .leaflet-popup.custom-popup .leaflet-popup-content-wrapper {
            background: var(--panel, #1a1f2e);
            color: var(--text, #e8ecf0);
            border-radius: 16px;
            padding: 0;
            border: 1px solid var(--border, rgba(156, 163, 175, 0.15));
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        
        .leaflet-popup.custom-popup .leaflet-popup-content {
            margin: 0;
            padding: 16px;
        }
        
        .leaflet-popup.custom-popup .leaflet-popup-tip {
            background: var(--panel, #1a1f2e);
        }
        
        .map-popup h4 {
            margin: 0 0 12px;
            color: #a855f7;
            font-size: 16px;
            font-weight: 700;
        }
        
        .map-popup .location {
            margin: 0 0 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .map-popup .location i {
            color: #a855f7;
        }
        
        .popup-dates {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(156, 163, 175, 0.15);
        }
        
        .popup-dates strong {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 0.9em;
        }
        
        .popup-dates ul {
            margin: 8px 0 0;
            padding-left: 20px;
            max-height: 120px;
            overflow-y: auto;
        }
        
        .popup-dates li {
            margin: 4px 0;
            color: #9ca3af;
            font-size: 0.85em;
        }
        
        .popup-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 12px;
            padding: 8px 12px;
            background: linear-gradient(135deg, #a855f7, #ec4899);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 0.85em;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .popup-link:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }
    `;
    document.head.appendChild(style);
}

function initializeMapWhenReady() {
    const mapContainer = document.getElementById('global-map');
    if (!mapContainer) {
        setTimeout(initializeMapWhenReady, 500);
        return;
    }
    
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        if (typeof L !== 'undefined' && typeof L.map === 'function') {
            clearInterval(checkInterval);
            initGlobalMap();
        } else if (attempts >= 100) {
            clearInterval(checkInterval);
            console.error('❌ Leaflet non disponible');
        }
    }, 50);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMapWhenReady);
} else {
    initializeMapWhenReady();
}

