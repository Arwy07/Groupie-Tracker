function openCart() {
    console.log('🛒 openCart() appelée');
    
    let cartModal = document.getElementById('cart-modal');
    if (!cartModal) {
        console.log('📦 Création du modal panier');
        cartModal = createCartModal();
    }
    
    loadCartItems();
    
    cartModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    console.log('✅ Panier ouvert');
}

function closeCart() {
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.classList.remove('is-open');
        document.body.style.overflow = '';
    }
}

function createCartModal() {
    const modal = document.createElement('div');
    modal.id = 'cart-modal';
    modal.className = 'cart-modal';
    modal.innerHTML = `
        <div class="cart-modal-overlay"></div>
        <div class="cart-modal-content">
            <button class="cart-modal-close" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="cart-header">
                <h2><i class="fas fa-shopping-cart"></i> Mon Panier</h2>
            </div>
            
            <div class="cart-body" id="cart-items">
                <div class="cart-loading">
                    <div class="spinner"></div>
                    <p>Chargement du panier...</p>
                </div>
            </div>
            
            <div class="cart-footer" id="cart-footer" style="display: none;">
                <div class="cart-total">
                    <span>Total:</span>
                    <span id="cart-total-amount">0€</span>
                </div>
                <div class="cart-actions">
                    <button class="btn btn-outline" id="cart-clear">Vider le panier</button>
                    <button class="btn btn-primary" id="cart-checkout">
                        <i class="fas fa-credit-card"></i>
                        <span>Procéder au paiement</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        const closeBtn = modal.querySelector('.cart-modal-close');
        const overlay = modal.querySelector('.cart-modal-overlay');
        const clearBtn = document.getElementById('cart-clear');
        const checkoutBtn = document.getElementById('cart-checkout');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCart);
        }
        if (overlay) {
            overlay.addEventListener('click', closeCart);
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', clearCart);
        }
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', proceedToCheckout);
        }
    }, 10);
    
    const escapeHandler = function(e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeCart();
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    modal._escapeHandler = escapeHandler;
    
    return modal;
}

function loadCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        console.error('Conteneur cart-items introuvable');
        return;
    }
    
    fetch('/api/cart', {
        credentials: 'include'
    })
        .then(response => {
            if (response.status === 401) {
                closeCart();
                window.location.href = '/login';
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            
            const cartFooter = document.getElementById('cart-footer');
            
            if (!data || !data.items || data.items.length === 0) {
                cartItemsContainer.innerHTML = `
                    <div class="cart-empty">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Votre panier est vide</p>
                        <button class="btn btn-primary" onclick="closeCart()">Continuer mes achats</button>
                    </div>
                `;
                if (cartFooter) cartFooter.style.display = 'none';
                return;
            }
            
            let total = 0;
            cartItemsContainer.innerHTML = data.items.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                
                // Sécuriser l'accès aux données du concert
                const concertData = item.concertData || {};
                const artistImage = concertData.artistImage || '/assets/pictures/cover.png';
                const artistName = concertData.artistName || 'Artiste inconnu';
                const location = concertData.location || 'Lieu inconnu';
                const dateFormatted = concertData.dateFormatted || 'Date non définie';
                
                return `
                    <div class="cart-item" data-item-id="${item.id}">
                        <div class="cart-item-image">
                            <img src="${artistImage}" alt="${artistName}" onerror="this.src='/assets/pictures/cover.png'">
                        </div>
                        <div class="cart-item-details">
                            <h3>${artistName}</h3>
                            <p class="cart-item-location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${location}
                            </p>
                            <p class="cart-item-date">
                                <i class="fas fa-calendar"></i>
                                ${dateFormatted}
                            </p>
                            <p class="cart-item-seat">
                                <i class="fas fa-chair"></i>
                                ${item.seatName || 'Place'} - ${item.quantity} billet${item.quantity > 1 ? 's' : ''}
                            </p>
                        </div>
                        <div class="cart-item-price">
                            <span class="price">${itemTotal}€</span>
                            <button class="cart-item-remove" onclick="removeCartItem(${item.id})" aria-label="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('cart-total-amount').textContent = `${total.toFixed(2)}€`;
            cartFooter.style.display = 'flex';
        })
        .catch(error => {
            console.error('Erreur lors du chargement du panier:', error);
            const cartItemsContainer = document.getElementById('cart-items');
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = `
                    <div class="cart-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erreur lors du chargement du panier</p>
                        <p style="font-size: 0.9rem; color: var(--muted); margin-top: 0.5rem;">${error.message}</p>
                        <button class="btn btn-primary" onclick="loadCartItems()" style="margin-top: 1rem;">Réessayer</button>
                    </div>
                `;
            }
        });
}

function removeCartItem(itemId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article du panier ?')) {
        return;
    }
    
    fetch(`/api/cart/remove/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadCartItems();
            updateCartCount();
        } else {
            alert('Erreur lors de la suppression: ' + (data.error || 'Erreur inconnue'));
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression. Veuillez réessayer.');
    });
}

function clearCart() {
    if (!confirm('Êtes-vous sûr de vouloir vider tout le panier ?')) {
        return;
    }
    
    fetch('/api/cart/clear', {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadCartItems();
            updateCartCount();
        } else {
            alert('Erreur lors du vidage du panier: ' + (data.error || 'Erreur inconnue'));
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors du vidage du panier. Veuillez réessayer.');
    });
}

function updateCartCount() {
    fetch('/api/cart/count', {
        credentials: 'include'
    })
        .then(response => {
            if (response.status === 401) {
                const cartCount = document.getElementById('cart-count');
                if (cartCount) {
                    cartCount.style.display = 'none';
                }
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            
            const cartButton = document.getElementById('cart-button');
            const cartCount = document.getElementById('cart-count');
            
            if (cartCount) {
                if (data.count > 0) {
                    cartCount.textContent = data.count;
                    cartCount.style.display = 'flex';
                } else {
                    cartCount.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour du compteur:', error);
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                cartCount.style.display = 'none';
            }
        });
}

function proceedToCheckout() {
    window.location.href = '/checkout';
}

window.openCart = openCart;
window.closeCart = closeCart;
window.removeCartItem = removeCartItem;

function initCartButton() {
    const cartButton = document.getElementById('cart-button');
    if (cartButton) {
        const newButton = cartButton.cloneNode(true);
        cartButton.parentNode.replaceChild(newButton, cartButton);
        
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Clic sur le bouton panier détecté');
            openCart();
        });
        
        console.log('✅ Bouton panier initialisé');
    } else {
        console.warn('⚠️ Bouton panier introuvable');
    }
}

function initCart() {
    updateCartCount();
    initCartButton();
}

// Exposer les fonctions globalement
window.openCart = openCart;
window.closeCart = closeCart;
window.updateCartCount = updateCartCount;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
} else {
    initCart();
}

