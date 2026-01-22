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
    
    const map = L.map('global-map', {
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        fadeAnimation: true,
        zoomAnimation: true,
        attributionControl: true,
        center: [30, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18
    });
    
    L.control.zoom({
        position: 'topright',
        zoomInTitle: 'Zoom avant',
        zoomOutTitle: 'Zoom arrière'
    }).addTo(map);
    
    // Utiliser CartoDB Voyager - style coloré moderne
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    });
    
    tileLayer.addTo(map);
    
    console.log('Carte Leaflet initialisée');
    
    const markers = [];
    const bounds = [];
    const markerGroups = {};
    
    function createPopupContent(concert, artistName) {
        // Afficher toutes les dates disponibles
        const dates = concert.dates || [];
        const datesList = dates.length > 0
            ? `<div class="popup-dates">
                  <strong><i class="fas fa-calendar-alt"></i> Dates de concert :</strong>
                  <ul>${dates.slice(0, 5).map(date => `<li>${date}</li>`).join('')}${dates.length > 5 ? `<li>... et ${dates.length - 5} autre(s)</li>` : ''}</ul>
              </div>`
            : '';
        
        return `
            <div class="map-popup">
                <h4>${artistName}</h4>
                <p class="location">
                    <i class="fas fa-map-marker-alt"></i>
                    <strong>${concert.displayLocation || 'Lieu inconnu'}</strong>
                </p>
                ${datesList}
            </div>
        `;
    }
    
    async function geocodeLocation(location) {
        try {
            console.log('Géocodage de:', location);
            const response = await fetch(`/api/geocode?location=${encodeURIComponent(location)}`);
            if (!response.ok) {
                console.warn(`Erreur API géocodage pour ${location}:`, response.status, response.statusText);
                return null;
            }
            const data = await response.json();
            if (data && data.lat !== undefined && data.lng !== undefined) {
                const coords = { lat: parseFloat(data.lat), lng: parseFloat(data.lng) };
                console.log(`✅ Coordonnées trouvées pour ${location}:`, coords);
                return coords;
            }
            console.warn(`Pas de coordonnées dans la réponse pour ${location}`);
        } catch (error) {
            console.error('Erreur géocodage pour', location, ':', error);
        }
        return null;
    }
    
    const artists = window.__ARTISTS || [];
    let validLocationsCount = 0;
    let missingCoordinatesCount = 0;
    
    console.log('Carte globale - Artistes chargés:', artists.length);
    
    async function processConcertGlobal(concert, artist) {
        let lat, lng;
        
        if (concert.coordinates) {
            if (concert.coordinates.lat !== undefined && concert.coordinates.lng !== undefined) {
                lat = parseFloat(concert.coordinates.lat);
                lng = parseFloat(concert.coordinates.lng);
            } else if (concert.coordinates.latitude !== undefined && concert.coordinates.longitude !== undefined) {
                lat = parseFloat(concert.coordinates.latitude);
                lng = parseFloat(concert.coordinates.longitude);
            }
        }
        
        if ((lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng))) {
            const locationToGeocode = concert.displayLocation || concert.location;
            if (!locationToGeocode) {
                missingCoordinatesCount++;
                return null;
            }
            
            const coords = await geocodeLocation(locationToGeocode);
            if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
                lat = coords.lat;
                lng = coords.lng;
                if (!concert.coordinates) concert.coordinates = {};
                concert.coordinates.lat = lat;
                concert.coordinates.lng = lng;
            } else {
                missingCoordinatesCount++;
                return null;
            }
        }
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            missingCoordinatesCount++;
            return null;
        }
        
        validLocationsCount++;
        const popupContent = createPopupContent(concert, artist.name);
        
        const markerIcon = L.divIcon({
            className: 'custom-marker upcoming',
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
        
        marker.options.interactive = true;
        marker.options.keyboard = true;
        
        marker.addTo(map);
        markers.push(marker);
        bounds.push([lat, lng]);
        
        if (!markerGroups[artist.id]) {
            markerGroups[artist.id] = [];
        }
        markerGroups[artist.id].push(marker);
        
        return marker;
    }
    
    async function loadAllMarkers() {
        const concertsToGeocode = [];
        const concertsWithCoords = [];
        
        console.log('Début du chargement des marqueurs...');
        console.log('Artistes disponibles:', artists.length);
        
        // Charger TOUS les concerts (pas de filtre par date car les données de l'API sont historiques)
        for (const artist of artists) {
            if (!artist.concerts || !Array.isArray(artist.concerts)) continue;
            for (const concert of artist.concerts) {
                if (!concert.displayLocation && !concert.location) continue;
                
                let hasCoords = false;
                if (concert.coordinates) {
                    if ((concert.coordinates.lat !== undefined && concert.coordinates.lng !== undefined) ||
                        (concert.coordinates.latitude !== undefined && concert.coordinates.longitude !== undefined)) {
                        const lat = parseFloat(concert.coordinates.lat || concert.coordinates.latitude);
                        const lng = parseFloat(concert.coordinates.lng || concert.coordinates.longitude);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            hasCoords = true;
                        }
                    }
                }
                if (hasCoords) {
                    concertsWithCoords.push({ concert, artist });
                } else {
                    concertsToGeocode.push({ concert, artist });
                }
            }
        }
        
        console.log(`${concertsWithCoords.length} concerts avec coordonnées, ${concertsToGeocode.length} à géocoder`);
        
        // Charger tous les concerts avec coordonnées
        console.log(`Chargement de ${concertsWithCoords.length} concerts...`);
        const promises = concertsWithCoords.map(({ concert, artist }) => 
            processConcertGlobal(concert, artist)
        );
        await Promise.all(promises);
        
        // Géocoder quelques concerts supplémentaires si nécessaire
        const maxToGeocode = Math.min(50, concertsToGeocode.length);
        
        for (let i = 0; i < maxToGeocode; i++) {
            if (i > 0 && i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            await processConcertGlobal(concertsToGeocode[i].concert, concertsToGeocode[i].artist);
        }
        
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
        }
        
        console.log(`Carte globale: ${validLocationsCount} marqueurs valides, ${missingCoordinatesCount} coordonnées manquantes`);
        
        if (validLocationsCount === 0 && markers.length === 0) {
            showMapError('Aucun concert disponible pour le moment.');
        } else {
            console.log(`✅ Carte chargée avec succès: ${validLocationsCount} marqueurs affichés`);
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
    
    // Cacher le loading immédiatement après initialisation de la carte
    const loadingElement = mapContainer.querySelector('.map-loading');
    if (loadingElement) {
        loadingElement.innerHTML = '<div class="spinner"></div><p>Chargement des concerts...</p>';
    }
    
    // Charger les marqueurs
    setTimeout(async () => {
        map.invalidateSize();
        console.log('Démarrage du chargement des marqueurs...');
        
        try {
            await loadAllMarkers();
        } catch (err) {
            console.error('Erreur lors du chargement des marqueurs:', err);
        }
        
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 300);
        }
    }, 300);
    
    function showMapError(message) {
        if (!mapContainer) {
            console.error('Impossible d\'afficher l\'erreur: conteneur introuvable');
            return;
        }
        console.error('Erreur de carte:', message);
        mapContainer.innerHTML = `
            <div class="error-message" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(10, 14, 26, 0.9); color: var(--text); padding: 2rem; text-align: center; z-index: 1000;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <p style="margin: 0 0 1rem; font-size: 1.1rem;">${message}</p>
                <p style="margin: 0; font-size: 0.9rem; color: var(--muted);">Vérifiez votre connexion internet et rechargez la page.</p>
                <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer;">Recharger</button>
            </div>
        `;
    }
    
    const style = document.createElement('style');
    style.textContent = `
        #global-map {
            width: 100% !important;
            height: 600px !important;
            min-height: 600px !important;
            max-height: 600px !important;
            position: relative !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            border-radius: 16px;
        }
        
        #global-map .leaflet-container {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 1 !important;
            border-radius: 16px;
            background: var(--bg-alt);
        }
        
        #global-map .leaflet-pane {
            z-index: 2 !important;
        }
        
        .custom-marker {
            position: relative;
            width: 28px;
            height: 36px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .marker-pin svg {
            width: 100%;
            height: 100%;
        }
        
        .custom-marker.upcoming .marker-pin {
            color: #8b5cf6;
            filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6));
        }
        
        .custom-marker.past .marker-pin {
            color: #6b7280;
            opacity: 0.7;
        }
        
        .custom-marker:hover {
            transform: scale(1.3) translateY(-4px);
            z-index: 1000 !important;
            filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
        }
        
        .custom-marker.upcoming:hover .marker-pin {
            color: #a78bfa;
            filter: drop-shadow(0 0 16px rgba(139, 92, 246, 0.9));
        }

        .leaflet-popup.custom-popup .leaflet-popup-content-wrapper {
            background: var(--panel);
            color: var(--text);
            border-radius: 16px;
            padding: 0;
            border: 1px solid var(--border);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(168, 85, 247, 0.2);
            backdrop-filter: blur(20px);
        }
        
        .leaflet-popup.custom-popup .leaflet-popup-content {
            margin: 0;
            padding: 20px;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .map-popup h4 {
            margin: 0 0 12px;
            color: var(--accent);
            font-size: 18px;
            font-weight: 700;
        }
        
        .map-popup .location {
            margin: 0 0 8px;
            color: var(--text);
            font-size: 0.95em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .map-popup .location i {
            color: var(--accent);
            font-size: 1.1em;
        }
        
        .map-popup .city {
            margin: 0 0 12px;
            color: var(--muted);
            font-size: 0.9em;
        }
        
        .popup-dates {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border);
        }
        
        .popup-dates strong {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            color: var(--text);
            font-size: 0.95em;
        }
        
        .popup-dates ul {
            margin: 8px 0 0;
            padding-left: 24px;
            max-height: 150px;
            overflow-y: auto;
        }
        
        .popup-dates li {
            margin: 6px 0;
            color: var(--muted);
            font-size: 0.9em;
        }
    `;
    document.head.appendChild(style);
}

function initializeMapWhenReady() {
    const mapContainer = document.getElementById('global-map');
    if (!mapContainer) {
        console.warn('Conteneur global-map introuvable, réessai dans 500ms...');
        setTimeout(initializeMapWhenReady, 500);
        return;
    }
    
    if (typeof waitForLeaflet !== 'undefined') {
        waitForLeaflet(() => {
            console.log('Initialisation de la carte globale...');
            initGlobalMap();
        });
    } else {
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof L !== 'undefined' && typeof L.map === 'function') {
                clearInterval(checkInterval);
                console.log('Initialisation de la carte globale (fallback)...');
                setTimeout(() => initGlobalMap(), 100);
            } else if (attempts >= 100) {
                clearInterval(checkInterval);
                console.error('❌ Leaflet non disponible après 100 tentatives');
            }
        }, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMapWhenReady);
} else {
    initializeMapWhenReady();
}

