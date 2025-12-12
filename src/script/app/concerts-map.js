// Garde-fou pour éviter les initialisations multiples
let concertsMapInitialized = false;

// Attendre que Leaflet soit chargé avant d'initialiser
function initConcertsMap() {
    // Vérifier si déjà initialisée
    if (concertsMapInitialized || window.concertsMap) {
        console.warn('Carte des concerts déjà initialisée');
        return;
    }
    
    const mapContainer = document.getElementById('concerts-map');
    if (!mapContainer) {
        console.warn('Conteneur concerts-map introuvable');
        return;
    }
    
    // Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas disponible');
        showMapError('Leaflet n\'a pas pu être chargé. Vérifiez votre connexion internet.');
        return;
    }
    
    // Marquer comme initialisée
    concertsMapInitialized = true;
    
    console.log('Initialisation de la carte des concerts...');
    
    // S'assurer que le conteneur a une taille définie
    if (mapContainer.offsetHeight === 0 || mapContainer.offsetWidth === 0) {
        console.warn('Conteneur de carte sans dimensions, attente...');
        setTimeout(() => initConcertsMap(), 100);
        concertsMapInitialized = false;
        return;
    }
    
    // Initialiser la carte avec une vue par défaut (monde)
    const map = L.map('concerts-map', {
        zoomControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        fadeAnimation: false, // Désactiver pour chargement plus rapide
        zoomAnimation: false, // Désactiver pour chargement plus rapide
        attributionControl: true,
        center: [20, 0], // Centre du monde
        zoom: 2 // Zoom initial pour voir le monde
    });
    
    // Ajouter le contrôle de zoom
    L.control.zoom({
        position: 'topright',
        zoomInTitle: 'Zoom avant',
        zoomOutTitle: 'Zoom arrière'
    }).addTo(map);
    
    // Ajouter la couche de tuiles (utiliser CartoDB qui est plus fiable)
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        detectRetina: true
    });
    
    // Fallback si CartoDB ne fonctionne pas
    tileLayer.on('tileerror', function() {
        console.warn('Erreur de chargement des tuiles CartoDB, basculement vers OpenStreetMap...');
        this.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    });
    
    tileLayer.addTo(map);
    
    console.log('Carte des concerts Leaflet initialisée');
    
    // Variables pour stocker les marqueurs
    const markers = [];
    const bounds = [];
    
    // Fonction pour créer le contenu du popup détaillé
    function createDetailedPopup(concert, artist) {
        const datesList = concert.dates && concert.dates.length > 0
            ? `<div class="popup-dates">
                  <strong><i class="fas fa-calendar-alt"></i> Dates de concert :</strong>
                  <ul>${concert.dates.map(date => `<li>${date}</li>`).join('')}</ul>
              </div>`
            : '<p class="no-dates">Aucune date disponible</p>';
        
        const membersList = artist.members && artist.members.length > 0
            ? `<div class="popup-members">
                  <strong><i class="fas fa-users"></i> Membres :</strong>
                  <p>${artist.members.join(', ')}</p>
              </div>`
            : '';
        
        return `
            <div class="concert-popup">
                <div class="popup-header">
                    <img src="${artist.image}" alt="${artist.name}" class="popup-artist-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23a855f7%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2220%22%3E${artist.name.charAt(0)}%3C/text%3E%3C/svg%3E'">
                    <div class="popup-artist-info">
                        <h4>${artist.name}</h4>
                        <p class="popup-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <strong>${concert.displayLocation || 'Lieu inconnu'}</strong>
                        </p>
                        <p class="popup-city">${concert.city || ''}${concert.city && concert.country ? ', ' : ''}${concert.country || ''}</p>
                    </div>
                </div>
                <div class="popup-details">
                    <div class="popup-meta">
                        <span><i class="fas fa-calendar"></i> Créé en ${artist.creationDate}</span>
                        <span><i class="fas fa-compact-disc"></i> 1er album: ${artist.firstAlbum}</span>
                    </div>
                    ${membersList}
                    ${datesList}
                    <div class="popup-actions">
                        <a href="/artist?id=${artist.id}" class="btn-popup">
                            <i class="fas fa-info-circle"></i>
                            Voir la fiche complète
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Fonction pour obtenir la couleur du marqueur selon la date
    function getMarkerColor(concert) {
        if (!concert.dates || concert.dates.length === 0) {
            return 'past';
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const hasUpcoming = concert.dates.some(dateStr => {
            try {
                const [day, month, year] = dateStr.split('-').map(Number);
                // Gérer les années à 2 chiffres (00-99 = 2000-2099)
                const fullYear = year < 100 ? 2000 + year : year;
                const concertDate = new Date(fullYear, month - 1, day);
                concertDate.setHours(0, 0, 0, 0);
                return concertDate >= today;
            } catch {
                return false;
            }
        });
        
        return hasUpcoming ? 'upcoming' : 'past';
    }
    
    // Fonction pour créer une icône de marqueur avec photo
    function createMarkerIcon(artist, isUpcoming) {
        const size = 60;
        const iconHtml = `
            <div class="custom-marker-with-photo ${isUpcoming ? 'upcoming' : 'past'}">
                <div class="marker-photo-container">
                    <img src="${artist.image}" alt="${artist.name}" class="marker-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="marker-photo-fallback" style="display: none;">
                        <i class="fas fa-music"></i>
                    </div>
                </div>
                <div class="marker-pin-shadow"></div>
            </div>
        `;
        
        return L.divIcon({
            className: 'custom-marker-photo',
            html: iconHtml,
            iconSize: [size, size],
            iconAnchor: [size / 2, size],
            popupAnchor: [0, -size]
        });
    }
    
    // Charger les artistes et créer les marqueurs
    const artists = window.__ARTISTS || [];
    let validLocationsCount = 0;
    let missingCoordinatesCount = 0;
    
    console.log('Artistes chargés:', artists.length);
    
    // Fonction pour géocoder une localisation via notre API backend
    async function geocodeLocation(location) {
        try {
            console.log('Géocodage de:', location);
            // Utiliser notre API backend qui utilise le cache et gère mieux les erreurs
            const response = await fetch(`/api/geocode?location=${encodeURIComponent(location)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.debug(`Localisation non trouvée: ${location}`);
                } else {
                    console.warn(`Erreur API pour ${location}:`, response.status, response.statusText);
                }
                return null;
            }
            
            const data = await response.json();
            if (data && data.lat !== undefined && data.lng !== undefined) {
                const coords = {
                    lat: parseFloat(data.lat),
                    lng: parseFloat(data.lng)
                };
                console.log(`✅ Coordonnées trouvées pour ${location}:`, coords);
                return coords;
            }
            console.warn(`Pas de coordonnées dans la réponse pour ${location}`);
        } catch (error) {
            console.error('Erreur de géocodage pour', location, ':', error);
            return null;
        }
        return null;
    }
    
    // Fonction pour traiter un concert
    async function processConcert(concert, artist) {
        // Vérifier les coordonnées avec les deux formats possibles
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
        
        // Si pas de coordonnées valides, essayer de géocoder
        if ((lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng))) {
            const locationToGeocode = concert.displayLocation || concert.location;
            if (!locationToGeocode) {
                missingCoordinatesCount++;
                return null;
            }
            
            // Essayer de géocoder
            const coords = await geocodeLocation(locationToGeocode);
            if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
                lat = coords.lat;
                lng = coords.lng;
                // Mettre en cache dans l'objet concert
                if (!concert.coordinates) {
                    concert.coordinates = {};
                }
                concert.coordinates.lat = lat;
                concert.coordinates.lng = lng;
            } else {
                missingCoordinatesCount++;
                return null; // Impossible de géocoder
            }
        }
        
        // Vérifier que les coordonnées sont valides
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            missingCoordinatesCount++;
            return null;
        }
        
        validLocationsCount++;
        const markerColor = getMarkerColor(concert);
        const isUpcoming = markerColor === 'upcoming';
        
        // Créer le marqueur avec photo
        const markerIcon = createMarkerIcon(artist, isUpcoming);
        
        const marker = L.marker([lat, lng], {
            icon: markerIcon
        });
        
        // Ajouter le popup détaillé
        marker.bindPopup(createDetailedPopup(concert, artist), {
            maxWidth: 400,
            minWidth: 300,
            className: 'concert-popup-wrapper',
            closeButton: true,
            autoClose: false,
            closeOnClick: false
        });
        
        // Ajouter le marqueur à la carte
        marker.addTo(map);
        markers.push(marker);
        bounds.push([lat, lng]);
        
        // Animation au survol
        marker.on('mouseover', function() {
            const icon = marker.getElement();
            if (icon) {
                icon.style.transform = 'scale(1.15)';
                icon.style.transition = 'transform 0.2s ease';
                icon.style.zIndex = '1000';
            }
        });
        
        marker.on('mouseout', function() {
            const icon = marker.getElement();
            if (icon) {
                icon.style.transform = 'scale(1)';
                icon.style.zIndex = '';
            }
        });
        
        return marker;
    }
    
    // Traiter tous les concerts avec géocodage progressif
    async function loadAllConcerts() {
        const concertsToGeocode = [];
        const concertsWithCoords = [];
        const loadingElement = mapContainer.querySelector('.map-loading');
        
        // Masquer immédiatement l'indicateur de chargement principal
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 300);
        }
        
        // Première passe : séparer les concerts avec et sans coordonnées
        for (const artist of artists) {
            if (!artist.concerts || !Array.isArray(artist.concerts)) continue;
            
            for (const concert of artist.concerts) {
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
                } else if (concert.displayLocation) {
                    concertsToGeocode.push({ concert, artist });
                }
            }
        }
        
        console.log(`${concertsWithCoords.length} concerts avec coordonnées, ${concertsToGeocode.length} à géocoder`);
        
        // Filtrer pour afficher TOUS les prochains concerts en priorité
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingConcerts = [];
        const pastConcerts = [];
        
        concertsWithCoords.forEach(({ concert, artist }) => {
            const isUpcoming = concert.dates && concert.dates.some(dateStr => {
                try {
                    const [day, month, year] = dateStr.split('-').map(Number);
                    const fullYear = year < 100 ? 2000 + year : year;
                    const concertDate = new Date(fullYear, month - 1, day);
                    concertDate.setHours(0, 0, 0, 0);
                    return concertDate >= today;
                } catch {
                    return false;
                }
            });
            
            if (isUpcoming) {
                upcomingConcerts.push({ concert, artist });
            } else {
                pastConcerts.push({ concert, artist });
            }
        });
        
        // Traiter d'abord TOUS les concerts à venir (priorité absolue)
        console.log(`Chargement de ${upcomingConcerts.length} concerts à venir...`);
        const upcomingPromises = upcomingConcerts.map(({ concert, artist }) => 
            processConcert(concert, artist)
        );
        await Promise.all(upcomingPromises);
        
        // Ajuster la vue immédiatement avec les concerts à venir
        if (bounds.length > 0) {
            if (bounds.length === 1) {
                map.setView(bounds[0], 13);
            } else {
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 10
                });
            }
        }
        
        // Traiter les concerts passés en arrière-plan
        if (pastConcerts.length > 0) {
            setTimeout(async () => {
                console.log(`Chargement de ${pastConcerts.length} concerts passés en arrière-plan...`);
                for (const { concert, artist } of pastConcerts) {
                    await processConcert(concert, artist);
                }
                if (bounds.length > 0) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
                }
            }, 500);
        }
        
        // Géocoder le reste en arrière-plan (limité à 30 pour commencer)
        const maxToGeocode = Math.min(30, concertsToGeocode.length);
        if (maxToGeocode > 0) {
            setTimeout(async () => {
                for (let i = 0; i < maxToGeocode; i++) {
                    if (i > 0 && i % 3 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1200));
                    }
                    await processConcert(concertsToGeocode[i].concert, concertsToGeocode[i].artist);
                }
                if (bounds.length > 0) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
                }
            }, 500);
        }
        
        console.log(`Carte chargée: ${validLocationsCount} marqueurs valides, ${missingCoordinatesCount} coordonnées manquantes`);
        
        // Afficher un message si pas de marqueurs
        if (validLocationsCount === 0) {
            showMapError('Aucune localisation disponible. Les coordonnées seront chargées automatiquement lors de la visite des pages artistes individuelles.');
        } else {
            console.log(`✅ Carte des concerts chargée: ${validLocationsCount} marqueurs affichés`);
            if (missingCoordinatesCount > 0) {
                console.warn(`${missingCoordinatesCount} localisations n'ont pas pu être géocodées`);
            }
        }
    }
    
    // Démarrer le chargement
    loadAllConcerts();
    
    // La vue sera ajustée dans loadAllConcerts()
    
    // Gérer le redimensionnement
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
    
    // Exposer la carte globalement
    window.concertsMap = map;
    window.concertsMarkers = markers;
    
    // Attendre que la carte soit complètement initialisée
    map.whenReady(() => {
        // Forcer le redimensionnement
        map.invalidateSize();
        
        // Afficher la carte immédiatement (sans attendre les marqueurs)
        const loadingElement = mapContainer.querySelector('.map-loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 300);
        }
        
        console.log(`Carte des concerts initialisée avec ${markers.length} marqueurs`);
    });
    
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
    
    // Ajouter les styles CSS pour les marqueurs avec photos et forcer la taille
    const style = document.createElement('style');
    style.textContent = `
        #concerts-map {
            width: 100% !important;
            height: 700px !important;
            min-height: 700px !important;
            max-height: 700px !important;
            position: relative !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        
        #concerts-map .leaflet-container {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 1 !important;
        }
        
        #concerts-map .leaflet-pane {
            z-index: 2 !important;
        }
        
        .custom-marker-with-photo {
            position: relative;
            width: 60px;
            height: 60px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .marker-photo-container {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            position: relative;
            z-index: 2;
            background: var(--bg-alt);
        }
        
        .marker-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .marker-photo-fallback {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, var(--accent), var(--accent-2));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
        }
        
        .marker-pin-shadow {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 15px solid rgba(0, 0, 0, 0.3);
            z-index: 1;
        }
        
        .custom-marker-with-photo.upcoming .marker-photo-container {
            border-color: var(--accent);
            box-shadow: 0 4px 16px rgba(168, 85, 247, 0.5);
        }
        
        .custom-marker-with-photo.past .marker-photo-container {
            border-color: var(--muted);
            opacity: 0.7;
        }
        
        .custom-marker-with-photo:hover {
            transform: scale(1.2);
            z-index: 1000;
        }
        
        .custom-marker-with-photo:hover .marker-photo-container {
            box-shadow: 0 6px 20px rgba(168, 85, 247, 0.7);
        }
        
        .leaflet-popup.concert-popup-wrapper .leaflet-popup-content-wrapper {
            background: var(--panel);
            color: var(--text);
            border-radius: 16px;
            padding: 0;
            border: 1px solid var(--border);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            max-width: 400px;
        }
        
        .leaflet-popup.concert-popup-wrapper .leaflet-popup-content {
            margin: 0;
            padding: 0;
        }
        
        .concert-popup {
            overflow: hidden;
        }
        
        .popup-header {
            display: flex;
            gap: 1rem;
            padding: 1.5rem;
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1));
            border-bottom: 1px solid var(--border);
        }
        
        .popup-artist-image {
            width: 80px;
            height: 80px;
            border-radius: 12px;
            object-fit: cover;
            border: 2px solid var(--accent);
            flex-shrink: 0;
        }
        
        .popup-artist-info {
            flex: 1;
        }
        
        .popup-artist-info h4 {
            margin: 0 0 0.5rem;
            color: var(--accent);
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .popup-location {
            margin: 0.25rem 0;
            color: var(--text);
            font-size: 0.95em;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .popup-location i {
            color: var(--accent);
        }
        
        .popup-city {
            margin: 0.25rem 0 0;
            color: var(--muted);
            font-size: 0.85em;
        }
        
        .popup-details {
            padding: 1.5rem;
        }
        
        .popup-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }
        
        .popup-meta span {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--muted);
            font-size: 0.85em;
        }
        
        .popup-meta i {
            color: var(--accent);
        }
        
        .popup-members {
            margin-bottom: 1rem;
        }
        
        .popup-members strong {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            color: var(--text);
            font-size: 0.9em;
        }
        
        .popup-members p {
            margin: 0;
            color: var(--muted);
            font-size: 0.85em;
            line-height: 1.5;
        }
        
        .popup-dates {
            margin-bottom: 1rem;
        }
        
        .popup-dates strong {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            color: var(--text);
            font-size: 0.9em;
        }
        
        .popup-dates ul {
            margin: 0.5rem 0 0;
            padding-left: 1.5rem;
            max-height: 150px;
            overflow-y: auto;
        }
        
        .popup-dates li {
            margin: 0.25rem 0;
            color: var(--muted);
            font-size: 0.85em;
        }
        
        .no-dates {
            color: var(--muted);
            font-style: italic;
            margin: 0;
        }
        
        .popup-actions {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }
        
        .btn-popup {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, var(--accent), var(--accent-2));
            color: white;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            width: 100%;
            justify-content: center;
        }
        
        .btn-popup:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);
        }
        
        .leaflet-popup-tip {
            background: var(--panel);
            border: 1px solid var(--border);
        }
        
        .leaflet-popup-close-button {
            color: var(--muted) !important;
            font-size: 20px !important;
            padding: 8px !important;
            transition: color 0.2s ease;
        }
        
        .leaflet-popup-close-button:hover {
            color: var(--text) !important;
        }
    `;
    document.head.appendChild(style);
}

// Initialiser quand le DOM est prêt et que Leaflet est chargé
function initializeConcertsMapWhenReady() {
    // Vérifier que le conteneur existe
    const mapContainer = document.getElementById('concerts-map');
    if (!mapContainer) {
        console.warn('Conteneur concerts-map introuvable, réessai dans 500ms...');
        setTimeout(initializeConcertsMapWhenReady, 500);
        return;
    }
    
    // Utiliser waitForLeaflet si disponible
    if (typeof waitForLeaflet !== 'undefined') {
        waitForLeaflet(() => {
            console.log('Initialisation de la carte des concerts...');
            initConcertsMap();
        });
    } else {
        // Fallback: vérifier manuellement
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof L !== 'undefined' && typeof L.map === 'function') {
                clearInterval(checkInterval);
                console.log('Initialisation de la carte des concerts (fallback)...');
                setTimeout(() => initConcertsMap(), 100);
            } else if (attempts >= 100) {
                clearInterval(checkInterval);
                console.error('❌ Leaflet non disponible après 100 tentatives');
            }
        }, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConcertsMapWhenReady);
} else {
    // DOM déjà chargé
    initializeConcertsMapWhenReady();
}

