// Fonction d'initialisation de la carte artiste
function initArtistMap() {
    const target = document.getElementById('artist-map');
    const artist = window.__ARTIST;
    
    if (!target || !artist) {
        console.warn('Carte artiste: conteneur ou données artiste introuvables');
        return;
    }
    
    // Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas disponible pour la carte artiste');
        showMapError(target, 'Leaflet n\'a pas pu être chargé. Vérifiez votre connexion.');
        return;
    }
    
    console.log('Initialisation de la carte artiste pour:', artist.name);
    
    // S'assurer que le conteneur a une taille définie
    if (target.offsetHeight === 0 || target.offsetWidth === 0) {
        console.warn('Conteneur de carte sans dimensions, attente...');
        setTimeout(() => initArtistMap(), 100);
        return;
    }
    
    // Initialiser la carte avec des options par défaut
    const map = L.map('artist-map', {
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        fadeAnimation: false, // Désactiver pour chargement plus rapide
        zoomAnimation: false, // Désactiver pour chargement plus rapide
        attributionControl: false
    });
    
    // Ajouter le contrôle de zoom personnalisé
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
    
    // Variables pour stocker les marqueurs et les limites
    const markers = [];
    const bounds = [];
    let hasValidLocations = false;
    
    // Fonction pour créer le contenu du popup
    function createPopupContent(concert) {
        const datesList = concert.dates && concert.dates.length > 0
            ? `<div class="popup-dates">
                  <strong>Dates :</strong>
                  <ul>${concert.dates.map(date => `<li>${date}</li>`).join('')}</ul>
              </div>`
            : '<p>Aucune date disponible</p>';
        
        return `
            <div class="map-popup">
                <h4>${concert.displayLocation || 'Lieu inconnu'}</h4>
                <p class="location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${concert.city || ''}${concert.city && concert.country ? ', ' : ''}${concert.country || ''}
                </p>
                ${datesList}
            </div>
        `;
    }
    
    // Créer un groupe pour les marqueurs
    const markerGroup = L.layerGroup().addTo(map);
    
    // Ajouter les marqueurs pour chaque concert
    if (Array.isArray(artist.concerts)) {
        artist.concerts.forEach((concert) => {
            // Vérifier les coordonnées avec les deux formats possibles
            let lat, lng;
            if (concert.coordinates) {
                // Format avec lat/lng (format JSON)
                if (concert.coordinates.lat !== undefined && concert.coordinates.lng !== undefined) {
                    lat = parseFloat(concert.coordinates.lat);
                    lng = parseFloat(concert.coordinates.lng);
                }
                // Format avec latitude/longitude (format Go struct)
                else if (concert.coordinates.latitude !== undefined && concert.coordinates.longitude !== undefined) {
                    lat = parseFloat(concert.coordinates.latitude);
                    lng = parseFloat(concert.coordinates.longitude);
                }
            }
            
            if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
                console.warn(`Coordonnées manquantes ou invalides pour: ${concert.displayLocation || 'Lieu inconnu'}`, concert.coordinates);
                return;
            }
            
            // S'assurer que les coordonnées sont valides
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn(`Coordonnées hors limites pour: ${concert.displayLocation || 'Lieu inconnu'}`, lat, lng);
                return;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Vérifier si le concert est à venir
            const hasUpcoming = concert.dates && concert.dates.some(dateStr => {
                const [day, month, year] = dateStr.split('-').map(Number);
                const concertDate = new Date(2000 + year, month - 1, day);
                return concertDate >= today;
            });
            
            // Créer le marqueur personnalisé avec une icône Leaflet standard d'abord
            const markerIcon = L.divIcon({
                className: `custom-marker ${hasUpcoming ? 'upcoming' : 'past'}`,
                html: '<div class="marker-pin"></div>',
                iconSize: [30, 42],
                iconAnchor: [15, 42],
                popupAnchor: [0, -36]
            });
            
            const marker = L.marker([lat, lng], {
                icon: markerIcon
            });
            
            // Ajouter le popup
            marker.bindPopup(createPopupContent(concert), {
                maxWidth: 300,
                minWidth: 200,
                className: 'custom-popup',
                closeButton: true,
                autoClose: false,
                closeOnClick: false
            });
            
            // Ajouter le marqueur au groupe
            marker.addTo(markerGroup);
            markers.push(marker);
            bounds.push([lat, lng]);
            hasValidLocations = true;
            
            // Stocker une référence au marqueur pour un accès facile
            marker.getElement()._marker = marker;
            
            // Gestion des événements de survol
            const element = marker.getElement();
            if (element) {
                element.addEventListener('mouseover', () => {
                    element.style.transform = 'scale(1.3) rotate(-45deg)';
                    element.style.transition = 'transform 0.2s ease';
                    element.style.zIndex = '1000';
                });
                
                element.addEventListener('mouseout', () => {
                    element.style.transform = 'scale(1) rotate(-45deg)';
                    element.style.zIndex = '';
                });
                
                // Animation au clic
                element.addEventListener('click', () => {
                    element.style.transform = 'scale(0.8) rotate(-45deg)';
                    setTimeout(() => {
                        element.style.transform = 'scale(1.2) rotate(-45deg)';
                        setTimeout(() => {
                            element.style.transform = 'scale(1) rotate(-45deg)';
                        }, 100);
                    }, 100);
                });
            }
        });
    }
    
    // Ajuster la vue de la carte pour afficher tous les marqueurs
    if (hasValidLocations && bounds.length > 0) {
        if (bounds.length === 1) {
            // Si un seul marqueur, centrer et zoomer
            map.setView(bounds[0], 13);
        } else {
            // Si plusieurs marqueurs, ajuster les limites
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 15
            });
        }
    } else {
        // Aucune localisation valide, afficher un message
        showMapError(target, "Aucune localisation valide n'a été trouvée pour cet artiste.");
        return;
    }
    
    // Gérer le redimensionnement de la fenêtre
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            map.invalidateSize();
            if (hasValidLocations && bounds.length > 0) {
                if (bounds.length === 1) {
                    map.setView(bounds[0], map.getZoom());
                } else {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }, 250);
    });
    
    // Fonction pour afficher les erreurs de carte
    function showMapError(container, message) {
        container.classList.add('map--empty');
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn btn-sm" id="retry-button">Réessayer</button>
            </div>
        `;
        
        // Gestion du bouton de réessai
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
    
    // Exposer la carte et les marqueurs globalement pour un accès facile
    window.map = map;
    window.markers = markers;
    
    // Ajouter des styles CSS pour les marqueurs personnalisés et forcer la taille
    const style = document.createElement('style');
    style.textContent = `
        #artist-map {
            width: 100% !important;
            height: 500px !important;
            min-height: 500px !important;
            max-height: 500px !important;
            position: relative !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        
        #artist-map .leaflet-container {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 1 !important;
        }
        
        #artist-map .leaflet-pane {
            z-index: 2 !important;
        }
        
        .custom-marker {
            position: relative;
            width: 30px;
            height: 42px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .marker-pin {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            left: 0;
            top: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .custom-marker.upcoming .marker-pin {
            background: linear-gradient(135deg, var(--accent), var(--accent-2));
        }
        
        .custom-marker.past .marker-pin {
            background: linear-gradient(135deg, var(--muted), #6b7280);
        }
        
        .marker-pin::after {
            content: '';
            position: absolute;
            width: 14px;
            height: 14px;
            background: white;
            border-radius: 50%;
            top: 8px;
            left: 8px;
        }
        
        .leaflet-popup.custom-popup {
            margin-bottom: 15px;
        }
        
        .leaflet-popup-content-wrapper {
            background: var(--panel);
            color: var(--text);
            border-radius: 12px;
            padding: 0;
            border: 1px solid var(--border);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        
        .leaflet-popup-content {
            margin: 0;
            padding: 16px;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .map-popup h4 {
            margin: 0 0 5px;
            color: var(--accent);
            font-size: 16px;
        }
        
        .map-popup .location {
            margin: 0 0 10px;
            color: var(--muted);
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .map-popup .location i {
            color: var(--accent);
        }
        
        .popup-dates {
            margin-top: 10px;
        }
        
        .popup-dates strong {
            display: block;
            margin-bottom: 5px;
            color: var(--text);
        }
        
        .popup-dates ul {
            margin: 5px 0 0;
            padding-left: 20px;
            max-height: 150px;
            overflow-y: auto;
        }
        
        .popup-dates li {
            margin: 4px 0;
            color: var(--muted);
            font-size: 0.9em;
        }
        
        .leaflet-popup-tip {
            background: var(--panel);
            border: 1px solid var(--border);
            border-top-color: transparent !important;
            border-left-color: transparent !important;
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
        
        .error-message {
            text-align: center;
            padding: 2rem;
        }
        
        .error-message i {
            font-size: 2.5rem;
            color: #ef4444;
            margin-bottom: 1rem;
            display: block;
        }
        
        .error-message p {
            margin: 0 0 1.5rem;
            color: var(--text);
        }
        
        .map-loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            z-index: 1000;
            transition: opacity 0.3s ease;
        }
        
        .map-loading .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: var(--accent);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 1rem;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(style);
    
    // Masquer l'indicateur de chargement
    const loadingElement = target.querySelector('.map-loading');
    if (loadingElement) {
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 300);
    }
    
    // Exposer la carte globalement pour les autres scripts
    window.artistMap = map;
    window.artistMarkers = markers;
    window.map = map; // Alias pour compatibilité
    window.markers = markers; // Alias pour compatibilité
    
    // Attendre que la carte soit complètement initialisée
    map.whenReady(() => {
        // Forcer le redimensionnement
        map.invalidateSize();
        
        // Masquer immédiatement l'indicateur de chargement
        const loadingElement = target.querySelector('.map-loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 300);
        }
        
        console.log(`✅ Carte initialisée avec ${markers.length} marqueurs`);
    });
}

// Initialiser quand le DOM est prêt et que Leaflet est chargé
function initializeArtistMapWhenReady() {
    // Vérifier que le conteneur existe
    const mapContainer = document.getElementById('artist-map');
    if (!mapContainer) {
        console.warn('Conteneur artist-map introuvable, réessai dans 500ms...');
        setTimeout(initializeArtistMapWhenReady, 500);
        return;
    }
    
    // Utiliser waitForLeaflet si disponible
    if (typeof waitForLeaflet !== 'undefined') {
        waitForLeaflet(() => {
            console.log('Initialisation de la carte artiste...');
            initArtistMap();
        });
    } else {
        // Fallback: vérifier manuellement
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof L !== 'undefined' && typeof L.map === 'function') {
                clearInterval(checkInterval);
                console.log('Initialisation de la carte artiste (fallback)...');
                setTimeout(() => initArtistMap(), 100);
            } else if (attempts >= 100) {
                clearInterval(checkInterval);
                console.error('❌ Leaflet non disponible après 100 tentatives pour la carte artiste');
            }
        }, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeArtistMapWhenReady);
} else {
    // DOM déjà chargé
    initializeArtistMapWhenReady();
}

