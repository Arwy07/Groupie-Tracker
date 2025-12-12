// Garde-fou pour éviter les initialisations multiples
let globalMapInitialized = false;

// Attendre que Leaflet soit chargé avant d'initialiser
function initGlobalMap() {
    // Vérifier si déjà initialisée
    if (globalMapInitialized || window.globalMap) {
        console.warn('Carte globale déjà initialisée');
        return;
    }
    
    const mapContainer = document.getElementById('global-map');
    if (!mapContainer) {
        console.warn('Conteneur global-map introuvable');
        return;
    }
    
    // Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas disponible');
        showMapError('Leaflet n\'a pas pu être chargé. Vérifiez votre connexion internet.');
        return;
    }
    
    // Marquer comme initialisée
    globalMapInitialized = true;
    
    console.log('Initialisation de la carte globale...');
    
    // S'assurer que le conteneur a une taille définie
    if (mapContainer.offsetHeight === 0 || mapContainer.offsetWidth === 0) {
        console.warn('Conteneur de carte sans dimensions, attente...');
        setTimeout(() => initGlobalMap(), 100);
        globalMapInitialized = false;
        return;
    }
    
    // Initialiser la carte avec une vue par défaut (monde)
    const map = L.map('global-map', {
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
    
    console.log('Carte Leaflet initialisée');
    
    // Variables pour stocker les marqueurs
    const markers = [];
    const bounds = [];
    const markerGroups = {}; // Grouper par artiste
    
    // Fonction pour filtrer les dates à venir
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
                // Ignorer les dates invalides
            }
        }
        
        // Trier par date
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
    
    // Fonction pour créer le contenu du popup
    function createPopupContent(concert, artistName) {
        const upcomingDates = getUpcomingDates(concert.dates);
        const datesList = upcomingDates.length > 0
            ? `<div class="popup-dates">
                  <strong><i class="fas fa-calendar-alt"></i> Prochains concerts :</strong>
                  <ul>${upcomingDates.slice(0, 5).map(date => `<li>${date}</li>`).join('')}${upcomingDates.length > 5 ? `<li>... et ${upcomingDates.length - 5} autre(s)</li>` : ''}</ul>
              </div>`
            : '<p class="no-dates"><i class="fas fa-calendar-times"></i> Aucun concert à venir</p>';
        
        return `
            <div class="map-popup">
                <h4>${artistName}</h4>
                <p class="location">
                    <i class="fas fa-map-marker-alt"></i>
                    <strong>${concert.displayLocation || 'Lieu inconnu'}</strong>
                </p>
                <p class="city">${concert.city || ''}${concert.city && concert.country ? ', ' : ''}${concert.country || ''}</p>
                ${datesList}
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
    
    // Fonction pour géocoder via notre API
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
    
    // Charger les artistes et créer les marqueurs
    const artists = window.__ARTISTS || [];
    let validLocationsCount = 0;
    let missingCoordinatesCount = 0;
    
    console.log('Carte globale - Artistes chargés:', artists.length);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:157',message:'Artistes chargés pour carte globale',data:{artistsCount:artists.length,artistsSample:artists.slice(0,2).map(a=>({id:a.id,name:a.name,concertsCount:a.concerts?.length||0}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    // Fonction pour traiter un concert
    async function processConcertGlobal(concert, artist) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:160',message:'processConcertGlobal ENTRY',data:{artistId:artist.id,artistName:artist.name,concertLocation:concert.displayLocation||concert.location,hasCoordinates:!!concert.coordinates},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        let lat, lng;
        
        // Vérifier les coordonnées existantes
        if (concert.coordinates) {
            if (concert.coordinates.lat !== undefined && concert.coordinates.lng !== undefined) {
                lat = parseFloat(concert.coordinates.lat);
                lng = parseFloat(concert.coordinates.lng);
            } else if (concert.coordinates.latitude !== undefined && concert.coordinates.longitude !== undefined) {
                lat = parseFloat(concert.coordinates.latitude);
                lng = parseFloat(concert.coordinates.longitude);
            }
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:175',message:'Coordonnées avant géocodage',data:{lat:lat,lng:lng,isValid:!isNaN(lat)&&!isNaN(lng)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        // Si pas de coordonnées valides, essayer de géocoder
        if ((lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng))) {
            const locationToGeocode = concert.displayLocation || concert.location;
            if (!locationToGeocode) {
                missingCoordinatesCount++;
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:178',message:'Pas de localisation à géocoder',data:{artistId:artist.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
                // #endregion
                return null;
            }
            
            // Essayer de géocoder
            const coords = await geocodeLocation(locationToGeocode);
            if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
                lat = coords.lat;
                lng = coords.lng;
                // Mettre en cache
                if (!concert.coordinates) concert.coordinates = {};
                concert.coordinates.lat = lat;
                concert.coordinates.lng = lng;
            } else {
                missingCoordinatesCount++;
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:192',message:'Géocodage échoué',data:{location:locationToGeocode,artistId:artist.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
                // #endregion
                return null;
            }
        }
        
        // Vérifier que les coordonnées sont valides
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            missingCoordinatesCount++;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:199',message:'Coordonnées invalides',data:{lat:lat,lng:lng,artistId:artist.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            return null;
        }
        
        validLocationsCount++;
        const markerColor = getMarkerColor(concert);
        const popupContent = createPopupContent(concert, artist.name);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:204',message:'Création marqueur AVANT',data:{lat:lat,lng:lng,markerColor:markerColor,popupContentLength:popupContent.length,artistId:artist.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        
        // Créer le marqueur personnalisé
        const markerIcon = L.divIcon({
            className: `custom-marker ${markerColor}`,
            html: '<div class="marker-pin"></div>',
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -36]
        });
        
        const marker = L.marker([lat, lng], {
            icon: markerIcon,
            interactive: true,
            keyboard: true,
            title: artist.name + ' - ' + (concert.displayLocation || 'Lieu inconnu')
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:216',message:'Marqueur créé',data:{markerExists:!!marker,lat:lat,lng:lng,artistId:artist.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        
        // Ajouter le popup
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            minWidth: 200,
            className: 'custom-popup',
            closeButton: true,
            autoClose: false,
            closeOnClick: false
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:227',message:'Popup lié au marqueur',data:{hasPopup:!!marker.getPopup(),artistId:artist.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        
        // Ajouter événement de clic pour ouvrir le popup
        marker.on('click', function(e) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:262',message:'Marqueur cliqué',data:{artistId:artist.id,artistName:artist.name,lat:lat,lng:lng},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            // Ouvrir le popup explicitement
            marker.openPopup();
        });
        
        // S'assurer que le marqueur est interactif
        marker.options.interactive = true;
        marker.options.keyboard = true;
        
        // Ajouter le marqueur à la carte
        marker.addTo(map);
        markers.push(marker);
        bounds.push([lat, lng]);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:238',message:'Marqueur ajouté à la carte',data:{markersCount:markers.length,boundsCount:bounds.length,artistId:artist.id,markerElement:!!marker.getElement()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        
        // Grouper par artiste pour le clustering visuel
        if (!markerGroups[artist.id]) {
            markerGroups[artist.id] = [];
        }
        markerGroups[artist.id].push(marker);
        
        return marker; // Retourner le marqueur pour indiquer le succès
    }
    
    // Traiter les concerts progressivement
    async function loadAllMarkers() {
        const concertsToGeocode = [];
        const concertsWithCoords = [];
        const loadingElement = mapContainer.querySelector('.map-loading');
        const progressElement = loadingElement?.querySelector('.loading-progress');
        
        console.log('Début du chargement des marqueurs...');
        
        // Masquer immédiatement l'indicateur de chargement principal
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 300);
        }
        
        // Séparer les concerts avec et sans coordonnées
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
        
        // Traiter d'abord TOUS les concerts à venir (priorité)
        console.log(`Chargement de ${upcomingConcerts.length} concerts à venir...`);
        const upcomingPromises = upcomingConcerts.map(({ concert, artist }) => 
            processConcertGlobal(concert, artist)
        );
        await Promise.all(upcomingPromises);
        
        // Mettre à jour la vue immédiatement avec les concerts à venir
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
        }
        
        // Traiter les concerts passés en arrière-plan
        if (pastConcerts.length > 0) {
            setTimeout(async () => {
                console.log(`Chargement de ${pastConcerts.length} concerts passés en arrière-plan...`);
                for (const { concert, artist } of pastConcerts) {
                    await processConcertGlobal(concert, artist);
                }
                if (bounds.length > 0) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
                }
            }, 500);
        }
        
        // Géocoder progressivement les autres (limité pour ne pas surcharger)
        const maxToGeocode = Math.min(50, concertsToGeocode.length); // Limiter à 50 pour commencer
        
        if (maxToGeocode > 0 && loadingElement) {
            loadingElement.querySelector('p').textContent = `Géocodage en cours...`;
            if (progressElement) {
                progressElement.textContent = `${maxToGeocode} localisation(s) à traiter`;
            }
        }
        
        let geocodedCount = 0;
        for (let i = 0; i < maxToGeocode; i++) {
            // Pause entre les requêtes pour respecter les limites de l'API
            if (i > 0 && i % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
            
            // Mettre à jour la progression
            if (progressElement && i % 3 === 0) {
                const progress = Math.round(((i + 1) / maxToGeocode) * 100);
                const remaining = maxToGeocode - i - 1;
                progressElement.textContent = `${i + 1}/${maxToGeocode} (${progress}%) - ${remaining} restant(s)`;
            }
            
            const result = await processConcertGlobal(concertsToGeocode[i].concert, concertsToGeocode[i].artist);
            if (result) {
                geocodedCount++;
            }
        }
        
        // Mettre à jour la vue après géocodage
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
        }
        
        console.log(`Carte globale: ${validLocationsCount} marqueurs valides, ${missingCoordinatesCount} coordonnées manquantes`);
        console.log(`Total marqueurs dans le tableau: ${markers.length}`);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/21d1d343-8a4c-4009-9c49-2a252ad5fa11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.js:420',message:'Résumé chargement marqueurs',data:{validLocationsCount:validLocationsCount,missingCoordinatesCount:missingCoordinatesCount,markersCount:markers.length,boundsCount:bounds.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        // Afficher un message si pas de marqueurs
        if (validLocationsCount === 0 && markers.length === 0) {
            const errorMsg = missingCoordinatesCount > 0 
                ? `Aucune coordonnée disponible pour le moment. ${missingCoordinatesCount} localisation(s) sans coordonnées. Les coordonnées sont géocodées automatiquement lors de la visite des pages artistes individuelles.`
                : 'Aucune localisation valide trouvée. Les coordonnées seront chargées lors de la visite des pages artistes.';
            showMapError(errorMsg);
        } else {
            console.log(`✅ Carte chargée avec succès: ${validLocationsCount} marqueurs affichés`);
            // Forcer la mise à jour de la vue pour s'assurer que les marqueurs sont visibles
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
            }
        }
    }
    
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
    window.globalMap = map;
    window.globalMarkers = markers;
    
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
        
        // Démarrer le chargement des marqueurs en arrière-plan
        loadAllMarkers();
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
    
    // Ajouter les styles CSS pour les marqueurs et forcer la taille
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
        }
        
        #global-map .leaflet-pane {
            z-index: 2 !important;
        }
        
        .custom-marker {
            position: relative;
            width: 30px;
            height: 42px;
            cursor: pointer;
            transition: all 0.2s ease;
            pointer-events: auto !important;
            z-index: 100 !important;
        }
        
        .marker-pin {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            left: 0;
            top: 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            pointer-events: auto !important;
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
        
        .custom-marker:hover {
            transform: scale(1.2) rotate(-45deg);
            z-index: 1000;
        }
        
        .leaflet-popup.custom-popup .leaflet-popup-content-wrapper {
            background: var(--panel);
            color: var(--text);
            border-radius: 12px;
            padding: 0;
            border: 1px solid var(--border);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        
        .leaflet-popup.custom-popup .leaflet-popup-content {
            margin: 0;
            padding: 16px;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .map-popup h4 {
            margin: 0 0 8px;
            color: var(--accent);
            font-size: 16px;
            font-weight: 600;
        }
        
        .map-popup .location {
            margin: 0 0 5px;
            color: var(--text);
            font-size: 0.95em;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .map-popup .location i {
            color: var(--accent);
        }
        
        .map-popup .city {
            margin: 0 0 10px;
            color: var(--muted);
            font-size: 0.85em;
        }
        
        .popup-dates {
            margin-top: 10px;
        }
        
        .popup-dates strong {
            display: block;
            margin-bottom: 5px;
            color: var(--text);
            font-size: 0.9em;
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
            font-size: 0.85em;
        }
    `;
    document.head.appendChild(style);
}

// Initialiser quand le DOM est prêt et que Leaflet est chargé
function initializeMapWhenReady() {
    // Vérifier que le conteneur existe
    const mapContainer = document.getElementById('global-map');
    if (!mapContainer) {
        console.warn('Conteneur global-map introuvable, réessai dans 500ms...');
        setTimeout(initializeMapWhenReady, 500);
        return;
    }
    
    // Utiliser waitForLeaflet si disponible
    if (typeof waitForLeaflet !== 'undefined') {
        waitForLeaflet(() => {
            console.log('Initialisation de la carte globale...');
            initGlobalMap();
        });
    } else {
        // Fallback: vérifier manuellement
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
    // DOM déjà chargé
    initializeMapWhenReady();
}


