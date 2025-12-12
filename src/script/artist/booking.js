// Modal de réservation de billets

// Types de places avec prix
const SEAT_TYPES = {
    fosse: {
        name: 'Fosse',
        description: 'Place debout au plus près de la scène',
        price: 45,
        icon: 'fas fa-users',
        available: true
    },
    gradin: {
        name: 'Gradin',
        description: 'Place assise avec vue panoramique',
        price: 65,
        icon: 'fas fa-chair',
        available: true
    },
    vip: {
        name: 'VIP',
        description: 'Accès VIP avec boissons et rencontre possible',
        price: 120,
        icon: 'fas fa-crown',
        available: true
    },
    premium: {
        name: 'Premium',
        description: 'Place premium avec vue privilégiée',
        price: 95,
        icon: 'fas fa-star',
        available: true
    }
};

// Fonction pour formater les dates (définie avant utilisation)
function formatConcertDateForBooking(dateStr) {
    try {
        const [day, month, year] = dateStr.split('-').map(Number);
        const fullYear = year < 100 ? 2000 + year : year;
        const date = new Date(fullYear, month - 1, day);
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return `${days[date.getDay()]} ${day} ${months[month - 1]} ${fullYear}`;
    } catch {
        return dateStr;
    }
}

// Fonction pour ouvrir le modal de réservation
function openBookingModal(concertData) {
    console.log('Ouverture du modal de réservation:', concertData);
    
    // Créer le modal s'il n'existe pas
    let modal = document.getElementById('booking-modal');
    if (!modal) {
        console.log('Création du modal...');
        modal = createBookingModal();
        document.body.appendChild(modal);
    }
    
    // Remplir les données du concert avec toutes les informations disponibles
    const artistName = concertData.artistName || (window.__ARTIST ? window.__ARTIST.name : '');
    const artistImage = concertData.artistImage || (window.__ARTIST ? window.__ARTIST.image : '');
    
    document.getElementById('booking-artist-name').textContent = artistName;
    if (artistImage) {
        const artistImg = document.querySelector('.booking-artist-image');
        if (artistImg) {
            artistImg.src = artistImage;
            artistImg.alt = artistName;
        }
    }
    document.getElementById('booking-location').textContent = concertData.location;
    const cityCountry = `${concertData.city || ''}${concertData.city && concertData.country ? ', ' : ''}${concertData.country || ''}`;
    document.getElementById('booking-city').textContent = cityCountry || concertData.location;
    document.getElementById('booking-date').textContent = concertData.dateFormatted;
    document.getElementById('booking-time').textContent = concertData.time;
    
    // Afficher le prix de départ
    const pricePreview = document.getElementById('booking-price-preview');
    if (pricePreview) {
        pricePreview.textContent = `À partir de ${concertData.price}€`;
    }
    
    // Afficher toutes les dates si disponibles
    const datesInfo = document.getElementById('booking-all-dates');
    if (datesInfo) {
        if (concertData.allDates && concertData.allDates.length > 1) {
            datesInfo.innerHTML = `
                <div class="all-dates-list">
                    <strong>Autres dates disponibles :</strong>
                    <ul>
                        ${concertData.allDates.filter(d => d !== concertData.date).slice(0, 5).map(date => {
                            const formatted = formatConcertDateForBooking(date);
                            return `<li>${formatted}</li>`;
                        }).join('')}
                        ${concertData.allDates.length > 6 ? `<li>... et ${concertData.allDates.length - 6} autres dates</li>` : ''}
                    </ul>
                </div>
            `;
            datesInfo.style.display = 'block';
        } else {
            datesInfo.style.display = 'none';
        }
    }
    
    // Réinitialiser la sélection
    resetBookingSelection();
    
    // Afficher le modal
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    
    // Ajouter les event listeners
    setupBookingListeners();
}

// Fonction pour créer le modal
function createBookingModal() {
    const modal = document.createElement('div');
    modal.id = 'booking-modal';
    modal.className = 'booking-modal';
    modal.innerHTML = `
        <div class="booking-modal-overlay"></div>
        <div class="booking-modal-content">
            <button class="booking-modal-close" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="booking-header">
                <div class="booking-artist-info">
                    <img src="${window.__ARTIST ? window.__ARTIST.image : ''}" alt="${window.__ARTIST ? window.__ARTIST.name : ''}" class="booking-artist-image" onerror="this.style.display='none'">
                    <div>
                        <h2 id="booking-artist-name">${window.__ARTIST ? window.__ARTIST.name : ''}</h2>
                        <div class="booking-location-info">
                            <i class="fas fa-map-marker-alt"></i>
                            <div>
                                <p id="booking-location" class="booking-location-name"></p>
                                <p id="booking-city" class="booking-city"></p>
                            </div>
                        </div>
                        <div class="booking-date-time-info">
                            <div class="date-time-item">
                                <i class="fas fa-calendar"></i>
                                <span id="booking-date"></span>
                            </div>
                            <div class="date-time-item">
                                <i class="fas fa-clock"></i>
                                <span id="booking-time"></span>
                            </div>
                            <div class="date-time-item price-preview">
                                <i class="fas fa-ticket-alt"></i>
                                <span id="booking-price-preview"></span>
                            </div>
                        </div>
                        <div id="booking-all-dates" style="display: none; margin-top: 1rem;"></div>
                    </div>
                </div>
            </div>
            
            <div class="booking-body">
                <div class="booking-section">
                    <h3><i class="fas fa-ticket-alt"></i> Choisissez votre type de place</h3>
                    <div class="seat-types-grid" id="seat-types-grid">
                        ${Object.entries(SEAT_TYPES).map(([key, seat]) => `
                            <div class="seat-type-card" data-seat-type="${key}">
                                <div class="seat-type-icon">
                                    <i class="${seat.icon}"></i>
                                </div>
                                <div class="seat-type-info">
                                    <h4>${seat.name}</h4>
                                    <p>${seat.description}</p>
                                    <div class="seat-type-price">
                                        <span class="price-amount">${seat.price}€</span>
                                        <span class="price-label">par personne</span>
                                    </div>
                                </div>
                                <div class="seat-type-select">
                                    <input type="radio" name="seat-type" id="seat-${key}" value="${key}">
                                    <label for="seat-${key}"></label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="booking-section" id="quantity-section" style="display: none;">
                    <h3><i class="fas fa-users"></i> Nombre de billets</h3>
                    <div class="quantity-selector">
                        <button class="quantity-btn" id="quantity-decrease" aria-label="Diminuer">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" id="quantity-input" value="1" min="1" max="10" readonly>
                        <button class="quantity-btn" id="quantity-increase" aria-label="Augmenter">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <p class="quantity-hint">Maximum 10 billets par commande</p>
                </div>
                
                <div class="booking-summary" id="booking-summary" style="display: none;">
                    <h3><i class="fas fa-receipt"></i> Récapitulatif</h3>
                    <div class="summary-details">
                        <div class="summary-row">
                            <span>Type de place</span>
                            <span id="summary-seat-type">-</span>
                        </div>
                        <div class="summary-row">
                            <span>Nombre de billets</span>
                            <span id="summary-quantity">-</span>
                        </div>
                        <div class="summary-row summary-total">
                            <span>Total</span>
                            <span id="summary-total">0€</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="booking-footer">
                <button class="btn btn-outline" id="booking-cancel">Annuler</button>
                <button class="btn btn-primary" id="booking-confirm" disabled>
                    <i class="fas fa-shopping-cart"></i>
                    <span>Confirmer la réservation</span>
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

// Fonction pour configurer les event listeners
function setupBookingListeners() {
    const modal = document.getElementById('booking-modal');
    
    // Fermer le modal
    modal.querySelector('.booking-modal-close').addEventListener('click', closeBookingModal);
    modal.querySelector('.booking-modal-overlay').addEventListener('click', closeBookingModal);
    document.getElementById('booking-cancel').addEventListener('click', closeBookingModal);
    
    // Sélection du type de place
    document.querySelectorAll('.seat-type-card').forEach(card => {
        card.addEventListener('click', function() {
            const seatType = this.getAttribute('data-seat-type');
            selectSeatType(seatType);
        });
    });
    
    // Gestion de la quantité
    document.getElementById('quantity-decrease').addEventListener('click', () => {
        const input = document.getElementById('quantity-input');
        const current = parseInt(input.value);
        if (current > 1) {
            input.value = current - 1;
            updateBookingSummary();
        }
    });
    
    document.getElementById('quantity-increase').addEventListener('click', () => {
        const input = document.getElementById('quantity-input');
        const current = parseInt(input.value);
        if (current < 10) {
            input.value = current + 1;
            updateBookingSummary();
        }
    });
    
    // Confirmation de la réservation
    document.getElementById('booking-confirm').addEventListener('click', confirmBooking);
    
    // Fermer avec Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeBookingModal();
        }
    });
}

// Fonction pour sélectionner un type de place
function selectSeatType(seatType) {
    // Désélectionner toutes les cartes
    document.querySelectorAll('.seat-type-card').forEach(card => {
        card.classList.remove('selected');
        card.querySelector('input[type="radio"]').checked = false;
    });
    
    // Sélectionner la carte choisie
    const selectedCard = document.querySelector(`[data-seat-type="${seatType}"]`);
    selectedCard.classList.add('selected');
    selectedCard.querySelector('input[type="radio"]').checked = true;
    
    // Afficher la section quantité
    document.getElementById('quantity-section').style.display = 'block';
    
    // Mettre à jour le récapitulatif
    updateBookingSummary();
}

// Fonction pour mettre à jour le récapitulatif
function updateBookingSummary() {
    const selectedSeat = document.querySelector('input[name="seat-type"]:checked');
    if (!selectedSeat) return;
    
    const seatType = selectedSeat.value;
    const seatData = SEAT_TYPES[seatType];
    const quantity = parseInt(document.getElementById('quantity-input').value);
    
    // Afficher le récapitulatif
    document.getElementById('booking-summary').style.display = 'block';
    
    // Mettre à jour les détails
    document.getElementById('summary-seat-type').textContent = seatData.name;
    document.getElementById('summary-quantity').textContent = quantity;
    
    const total = seatData.price * quantity;
    document.getElementById('summary-total').textContent = `${total}€`;
    
    // Activer le bouton de confirmation
    document.getElementById('booking-confirm').disabled = false;
}

// Fonction pour réinitialiser la sélection
function resetBookingSelection() {
    document.querySelectorAll('.seat-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelectorAll('input[name="seat-type"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('quantity-input').value = 1;
    document.getElementById('quantity-section').style.display = 'none';
    document.getElementById('booking-summary').style.display = 'none';
    document.getElementById('booking-confirm').disabled = true;
}

// Fonction pour fermer le modal
function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
    }
}

// Fonction pour confirmer la réservation
function confirmBooking() {
    const selectedSeat = document.querySelector('input[name="seat-type"]:checked');
    if (!selectedSeat) return;
    
    const seatType = selectedSeat.value;
    const seatData = SEAT_TYPES[seatType];
    const quantity = parseInt(document.getElementById('quantity-input').value);
    const total = seatData.price * quantity;
    
    // Afficher un message de confirmation
    const confirmMessage = `
        <div class="booking-confirmation">
            <div class="confirmation-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Réservation confirmée !</h3>
            <p>Vous avez réservé <strong>${quantity}</strong> billet${quantity > 1 ? 's' : ''} ${seatData.name.toLowerCase()}</p>
            <p class="confirmation-total">Total : <strong>${total}€</strong></p>
            <p class="confirmation-note">Un email de confirmation vous sera envoyé sous peu.</p>
            <button class="btn btn-primary" onclick="closeBookingModal(); location.reload();">
                Parfait !
            </button>
        </div>
    `;
    
    const bookingBody = document.querySelector('.booking-body');
    bookingBody.innerHTML = confirmMessage;
    
    // Scroll vers le haut du modal
    document.querySelector('.booking-modal-content').scrollTop = 0;
}

