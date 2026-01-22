let concertsMapInitialized = false;

function initConcertsMap() {
    if (concertsMapInitialized || window.concertsMap) {
        console.warn('Carte des concerts déjà initialisée');
        return;
    }
    
    const mapContainer = document.getElementById('concerts-map');
    if (!mapContainer) {
        console.warn('Conteneur concerts-map introuvable');
        return;
    }
    
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas disponible');
        showMapError('Leaflet n\'a pas pu être chargé. Vérifiez votre connexion internet.');
        return;
    }
    
    concertsMapInitialized = true;
    
    console.log('Initialisation de la carte des concerts...');
    
    if (mapContainer.offsetHeight === 0 || mapContainer.offsetWidth === 0) {
        console.warn('Conteneur de carte sans dimensions, attente...');
        setTimeout(() => initConcertsMap(), 100);
        concertsMapInitialized = false;
        return;
    }
    
    const map = L.map('concerts-map', {
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
    
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    });
    
    tileLayer.addTo(map);
    
    console.log('Carte des concerts Leaflet initialisée');
    
    const markers = [];
    const bounds = [];
    
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
    
    function createDetailedPopup(concert, artist) {
        const upcomingDates = getUpcomingDates(concert.dates);
        const datesList = upcomingDates.length > 0
            ? `<div class="popup-dates">
                  <strong><i class="fas fa-calendar-alt"></i> Prochains concerts :</strong>
                  <ul>${upcomingDates.map(date => `<li>${date}</li>`).join('')}</ul>
              </div>`
            : '<p class="no-dates"><i class="fas fa-calendar-times"></i> Aucun concert à venir</p>';
        
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
    
    function getMarkerColor(concert) {
        if (!concert.dates || concert.dates.length === 0) {
            return 'past';
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const hasUpcoming = concert.dates.some(dateStr => {
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
        
        return hasUpcoming ? 'upcoming' : 'past';
    }
    
    function createMarkerIcon(artist, isUpcoming) {
        const iconHtml = `
            <div class="custom-marker ${isUpcoming ? 'upcoming' : 'past'}">
                <div class="marker-pin">
                    <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="currentColor"/>
                        <circle cx="12" cy="12" r="5" fill="white"/>
                    </svg>
                </div>
            </div>
        `;
        
        return L.divIcon({
            className: 'custom-marker-wrapper',
            html: iconHtml,
            iconSize: [28, 36],
            iconAnchor: [14, 36],
            popupAnchor: [0, -36]
        });
    }
    
    const artists = window.__ARTISTS || [];
    let validLocationsCount = 0;
    let missingCoordinatesCount = 0;
    
    console.log('Artistes chargés:', artists.length);
    
    async function geocodeLocation(location) {
        try {
            console.log('Géocodage de:', location);
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
    
    async function processConcert(concert, artist) {
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
                if (!concert.coordinates) {
                    concert.coordinates = {};
                }
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
        const markerColor = getMarkerColor(concert);
        const isUpcoming = markerColor === 'upcoming';
        const popupContent = createDetailedPopup(concert, artist);
        
        const markerIcon = createMarkerIcon(artist, isUpcoming);
        
        const marker = L.marker([lat, lng], {
            icon: markerIcon,
            interactive: true,
            keyboard: true,
            title: artist.name + ' - ' + (concert.displayLocation || 'Lieu inconnu')
        });
        
        marker.bindPopup(popupContent, {
            maxWidth: 400,
            minWidth: 300,
            className: 'concert-popup-wrapper',
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
    
    async function loadAllConcerts() {
        const concertsToGeocode = [];
        const concertsWithCoords = [];
        const loadingElement = mapContainer.querySelector('.map-loading');
        
        console.log('Chargement des concerts...');
        console.log('Artistes disponibles:', artists.length);
        
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
        
        // Charger tous les concerts avec coordonnées
        console.log(`Chargement de ${concertsWithCoords.length} concerts...`);
        const promises = concertsWithCoords.map(({ concert, artist }) => 
            processConcert(concert, artist)
        );
        await Promise.all(promises);
        
        // Géocoder quelques concerts supplémentaires
        const maxToGeocode = Math.min(50, concertsToGeocode.length);
        for (let i = 0; i < maxToGeocode; i++) {
            if (i > 0 && i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            await processConcert(concertsToGeocode[i].concert, concertsToGeocode[i].artist);
        }
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        if (bounds.length > 0) {
            if (bounds.length === 1) {
                map.setView(bounds[0], 13);
            } else {
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 6
                });
            }
        }
        
        console.log(`Carte chargée: ${validLocationsCount} marqueurs valides`);
        
        if (validLocationsCount === 0) {
            showMapError('Aucun concert disponible pour le moment.');
        } else {
            console.log(`✅ Carte des concerts chargée: ${validLocationsCount} marqueurs affichés`);
        }
    }
    
    loadAllConcerts();
    
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
    
    window.concertsMap = map;
    window.concertsMarkers = markers;
    
    map.whenReady(() => {
        map.invalidateSize();
        
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
}

function initializeConcertsMapWhenReady() {
    const mapContainer = document.getElementById('concerts-map');
    if (!mapContainer) {
        console.warn('Conteneur concerts-map introuvable, réessai dans 500ms...');
        setTimeout(initializeConcertsMapWhenReady, 500);
        return;
    }
    
    if (typeof waitForLeaflet !== 'undefined') {
        waitForLeaflet(() => {
            console.log('Initialisation de la carte des concerts...');
            initConcertsMap();
        });
    } else {
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
    initializeConcertsMapWhenReady();
}

