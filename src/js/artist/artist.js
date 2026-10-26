function initArtistMap() {
    const target = document.getElementById('artist-map');
    const artist = window.__ARTIST;
    
    if (!target || !artist) {
        console.warn('Carte artiste: conteneur ou données artiste introuvables');
        return;
    }
    
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas disponible pour la carte artiste');
        showMapError(target, 'Leaflet n\'a pas pu être chargé. Vérifiez votre connexion.');
        return;
    }
    
    console.log('Initialisation de la carte artiste pour:', artist.name);
    
    if (target.offsetHeight === 0 || target.offsetWidth === 0) {
        console.warn('Conteneur de carte sans dimensions, attente...');
        setTimeout(() => initArtistMap(), 100);
        return;
    }
    
    const map = L.map('artist-map', {
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        fadeAnimation: true,
        zoomAnimation: true,
        attributionControl: true
    });
    
    L.control.zoom({
        position: 'topright',
        zoomInTitle: 'Zoom avant',
        zoomOutTitle: 'Zoom arrière'
    }).addTo(map);
    
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    });
    
    tileLayer.addTo(map);
    
    const markers = [];
    const bounds = [];
    let hasValidLocations = false;
    
    function getUpcomingDates(dates) {
        if (!dates || dates.length === 0) return [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingDates = [];
        for (const dateStr of dates) {
            try {
                const [day, month, year] = dateStr.split('-').map(Number);
                const fullYear = year < 100 ? 2000 + year : year;
                const concertDate = new Date(fullYear, month - 1, day);
                concertDate.setHours(0, 0, 0, 0);
                
                if (concertDate >= today) {
                    upcomingDates.push(dateStr);
                }
            } catch (e) {
            }
        }
        
        upcomingDates.sort((a, b) => {
            try {
                const [dayA, monthA, yearA] = a.split('-').map(Number);
                const [dayB, monthB, yearB] = b.split('-').map(Number);
                const fullYearA = yearA < 100 ? 2000 + yearA : yearA;
                const fullYearB = yearB < 100 ? 2000 + yearB : yearB;
                const dateA = new Date(fullYearA, monthA - 1, dayA);
                const dateB = new Date(fullYearB, monthB - 1, dayB);
                return dateA - dateB;
            } catch {
                return 0;
            }
        });
        
        return upcomingDates;
    }
    
    function createPopupContent(concert) {
        const upcomingDates = getUpcomingDates(concert.dates);
        const datesList = upcomingDates.length > 0
            ? `<div class="popup-dates">
                  <strong><i class="fas fa-calendar-alt"></i> Prochains concerts :</strong>
                  <ul>${upcomingDates.map(date => `<li>${date}</li>`).join('')}</ul>
              </div>`
            : '<p class="no-dates"><i class="fas fa-calendar-times"></i> Aucun concert à venir</p>';
        
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
    
    const markerGroup = L.layerGroup().addTo(map);
    
    if (Array.isArray(artist.concerts)) {
        artist.concerts.forEach((concert) => {
            let lat, lng;
            if (concert.coordinates) {
                if (concert.coordinates.lat !== undefined && concert.coordinates.lng !== undefined) {
                    lat = parseFloat(concert.coordinates.lat);
                    lng = parseFloat(concert.coordinates.lng);
                }
                else if (concert.coordinates.latitude !== undefined && concert.coordinates.longitude !== undefined) {
                    lat = parseFloat(concert.coordinates.latitude);
                    lng = parseFloat(concert.coordinates.longitude);
                }
            }
            
            if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
                console.warn(`Coordonnées manquantes ou invalides pour: ${concert.displayLocation || 'Lieu inconnu'}`, concert.coordinates);
                return;
            }
            
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn(`Coordonnées hors limites pour: ${concert.displayLocation || 'Lieu inconnu'}`, lat, lng);
                return;
            }
            
            const markerIcon = L.divIcon({
                className: `custom-marker upcoming`,
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
                icon: markerIcon
            });
            
            marker.bindPopup(createPopupContent(concert), {
                maxWidth: 300,
                minWidth: 200,
                className: 'custom-popup',
                closeButton: true,
                autoClose: false,
                closeOnClick: false
            });
            
            marker.addTo(markerGroup);
            markers.push(marker);
            bounds.push([lat, lng]);
            hasValidLocations = true;
            
            marker.getElement()._marker = marker;
            
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
    
    if (hasValidLocations && bounds.length > 0) {
        if (bounds.length === 1) {
            map.setView(bounds[0], 13);
        } else {
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 15
            });
        }
    } else {
        showMapError(target, "Aucune localisation valide n'a été trouvée pour cet artiste.");
        return;
    }
    
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
    
    function showMapError(container, message) {
        container.classList.add('map--empty');
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn btn-sm" id="retry-button">Réessayer</button>
            </div>
        `;
        
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
    
    window.map = map;
    window.markers = markers;
    
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
        
        .custom-marker {
            position: relative;
            width: 28px;
            height: 36px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 100;
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
        }
        
        .marker-pin {
            position: absolute;
            width: 100%;
            height: 100%;
            left: 0;
            top: 0;
            transition: all 0.3s ease;
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
    `;
    
    document.head.appendChild(style);
    
    const loadingElement = target.querySelector('.map-loading');
    if (loadingElement) {
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 300);
    }
    
    window.artistMap = map;
    window.artistMarkers = markers;
    window.map = map;
    window.markers = markers;
    
    map.whenReady(() => {
        map.invalidateSize();
        
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

function initializeArtistMapWhenReady() {
    const mapContainer = document.getElementById('artist-map');
    if (!mapContainer) {
        console.warn('Conteneur artist-map introuvable, réessai dans 500ms...');
        setTimeout(initializeArtistMapWhenReady, 500);
        return;
    }
    
    if (typeof waitForLeaflet !== 'undefined') {
        waitForLeaflet(() => {
            console.log('Initialisation de la carte artiste...');
            initArtistMap();
        });
    } else {
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
    initializeArtistMapWhenReady();
}

