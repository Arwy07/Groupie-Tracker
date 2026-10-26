// Injecter les styles globaux pour les marqueurs de carte
(function injectMapMarkerStyles() {
    if (document.getElementById('map-marker-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'map-marker-styles';
    style.textContent = `
        .custom-marker-wrapper {
            background: transparent !important;
            border: none !important;
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
        
        .custom-marker .marker-pin {
            position: absolute;
            width: 100%;
            height: 100%;
            left: 0;
            top: 0;
            pointer-events: auto !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-marker .marker-pin svg {
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
        
        /* Popup amélioré */
        .map-popup.enhanced, .concert-popup.enhanced {
            padding: 0;
            min-width: 280px;
        }
        
        .popup-header-enhanced {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 12px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.1));
            border-radius: 12px 12px 0 0;
        }
        
        .popup-artist-img {
            width: 56px;
            height: 56px;
            border-radius: 10px;
            object-fit: cover;
            border: 2px solid rgba(139, 92, 246, 0.5);
            flex-shrink: 0;
        }
        
        .popup-title-area {
            flex: 1;
            min-width: 0;
        }
        
        .popup-title-area h4 {
            margin: 0 0 6px;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text, #fff);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-badge.upcoming {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }
        
        .status-badge.past {
            background: rgba(107, 114, 128, 0.2);
            color: #9ca3af;
        }
        
        .status-badge i {
            font-size: 0.5rem;
        }
        
        .popup-body {
            padding: 12px;
        }
        
        .popup-body .location {
            margin: 0 0 8px;
            font-size: 0.9rem;
            color: var(--text, #e8ecf0);
        }
        
        .popup-body .location i {
            color: #a855f7;
            margin-right: 6px;
        }
        
        .popup-members {
            font-size: 0.8rem;
            color: var(--muted, #9ca3af);
            margin-bottom: 8px;
        }
        
        .popup-members i {
            margin-right: 6px;
            color: #8b5cf6;
        }
        
        .popup-dates {
            font-size: 0.85rem;
            margin-bottom: 8px;
        }
        
        .popup-dates strong {
            display: block;
            margin-bottom: 4px;
            color: var(--text, #e8ecf0);
        }
        
        .popup-dates ul {
            margin: 0;
            padding-left: 20px;
            color: var(--muted, #9ca3af);
        }
        
        .popup-dates li {
            margin: 2px 0;
        }
        
        .popup-dates li.more {
            color: #8b5cf6;
            font-style: italic;
        }
        
        .popup-actions-enhanced {
            display: flex;
            gap: 8px;
            padding: 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 0 0 12px 12px;
            margin-top: 8px;
        }
        
        .popup-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 500;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .popup-btn.secondary {
            background: rgba(107, 114, 128, 0.3);
            color: var(--text, #e8ecf0);
        }
        
        .popup-btn.secondary:hover {
            background: rgba(107, 114, 128, 0.5);
        }
        
        .popup-btn.primary {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
        }
        
        .popup-btn.primary:hover {
            background: linear-gradient(135deg, #a78bfa, #8b5cf6);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        
        /* Notification */
        .map-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 24px;
            border-radius: 12px;
            background: var(--panel, #1a1f2e);
            color: var(--text, #fff);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid var(--border, rgba(156, 163, 175, 0.15));
        }
        
        .map-notification.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .map-notification.success {
            border-left: 4px solid #22c55e;
        }
        
        .map-notification.success i {
            color: #22c55e;
        }
        
        .map-notification.warning {
            border-left: 4px solid #f59e0b;
        }
        
        .map-notification.warning i {
            color: #f59e0b;
        }
        
        .map-notification.error {
            border-left: 4px solid #ef4444;
        }
        
        .map-notification.error i {
            color: #ef4444;
        }
        
        .map-notification i {
            font-size: 1.3rem;
        }
        
        .map-notification span {
            font-size: 0.95rem;
            line-height: 1.4;
        }
        
        .map-notification small {
            display: block;
            color: var(--muted, #9ca3af);
            margin-top: 2px;
        }
        
        /* Modal détails artiste */
        .artist-details-modal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .artist-details-modal.is-open {
            opacity: 1;
            visibility: visible;
        }
        
        .artist-details-modal .modal-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(4px);
        }
        
        .artist-details-modal .modal-content {
            position: relative;
            background: var(--panel, #1a1f2e);
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            border: 1px solid var(--border, rgba(156, 163, 175, 0.15));
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            transform: scale(0.9) translateY(20px);
            transition: transform 0.3s ease;
        }
        
        .artist-details-modal.is-open .modal-content {
            transform: scale(1) translateY(0);
        }
        
        .artist-details-modal .modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            color: var(--text, #fff);
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s;
        }
        
        .artist-details-modal .modal-close:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: rotate(90deg);
        }
        
        .artist-detail-header {
            display: flex;
            gap: 16px;
            padding: 24px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1));
            border-radius: 20px 20px 0 0;
        }
        
        .artist-detail-img {
            width: 100px;
            height: 100px;
            border-radius: 16px;
            object-fit: cover;
            border: 3px solid rgba(139, 92, 246, 0.5);
            flex-shrink: 0;
        }
        
        .artist-detail-info h2 {
            margin: 0 0 8px;
            font-size: 1.5rem;
            color: var(--text, #fff);
        }
        
        .artist-meta {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.85rem;
            color: var(--muted, #9ca3af);
        }
        
        .artist-meta span {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .artist-meta i {
            color: #8b5cf6;
            width: 16px;
        }
        
        .artist-detail-body {
            padding: 20px 24px;
        }
        
        .detail-section {
            margin-bottom: 20px;
        }
        
        .detail-section:last-child {
            margin-bottom: 0;
        }
        
        .detail-section h3 {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1rem;
            color: var(--text, #fff);
            margin: 0 0 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border, rgba(156, 163, 175, 0.15));
        }
        
        .detail-section h3 i {
            color: #8b5cf6;
        }
        
        .members-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .member-tag {
            background: rgba(139, 92, 246, 0.15);
            color: #a78bfa;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
        }
        
        .concerts-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .concert-item-detail {
            background: rgba(0, 0, 0, 0.2);
            padding: 12px;
            border-radius: 10px;
            border-left: 3px solid #8b5cf6;
        }
        
        .concert-location {
            font-size: 0.9rem;
            color: var(--text, #e8ecf0);
            margin-bottom: 4px;
        }
        
        .concert-location i {
            color: #8b5cf6;
            margin-right: 6px;
        }
        
        .concert-dates {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        
        .concert-dates span {
            font-size: 0.75rem;
            background: rgba(139, 92, 246, 0.2);
            color: #a78bfa;
            padding: 2px 8px;
            border-radius: 4px;
        }
        
        .artist-detail-footer {
            padding: 16px 24px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 0 0 20px 20px;
            display: flex;
            justify-content: center;
        }
        
        .btn-detail {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 24px;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.2s;
        }
        
        .btn-detail.secondary {
            background: rgba(107, 114, 128, 0.3);
            color: var(--text, #e8ecf0);
        }
        
        .btn-detail.secondary:hover {
            background: rgba(139, 92, 246, 0.3);
            color: #a78bfa;
        }
    `;
    document.head.appendChild(style);
})();

// Utilitaire debounce pour optimiser les performances
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fonction globale pour ouvrir les détails de l'artiste depuis la carte
window.openArtistDetailsFromMap = function(artistDataEncoded) {
    const artist = JSON.parse(decodeURIComponent(artistDataEncoded));
    
    // Debug: afficher les données reçues
    console.log('Artist data received:', artist);
    console.log('Artist image URL:', artist.image);
    
    // Fermer les popups de carte
    if (window.globalMap) window.globalMap.closePopup();
    if (window.concertsMap) window.concertsMap.closePopup();
    
    // Créer la modal de détails
    let modal = document.getElementById('artist-details-modal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'artist-details-modal';
    modal.className = 'artist-details-modal';
    
    const membersList = artist.members && artist.members.length > 0
        ? artist.members.map(m => `<span class="member-tag">${m}</span>`).join('')
        : '<span class="no-members">Non renseigné</span>';
    
    const concertsList = artist.concerts && artist.concerts.length > 0
        ? artist.concerts.slice(0, 8).map(c => `
            <div class="concert-item-detail">
                <div class="concert-location"><i class="fas fa-map-marker-alt"></i> ${c.displayLocation || c.location}</div>
                <div class="concert-dates">${(c.dates || []).slice(0, 3).map(d => `<span>${d}</span>`).join('')}</div>
            </div>
        `).join('')
        : '<p>Aucun concert</p>';
    
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeArtistDetailsModal()"></div>
        <div class="modal-content">
            <button class="modal-close" onclick="closeArtistDetailsModal()">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="artist-detail-header">
                <img src="${artist.image}" alt="${artist.name}" class="artist-detail-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23a855f7%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2224%22%3E${artist.name.charAt(0)}%3C/text%3E%3C/svg%3E'">
                <div class="artist-detail-info">
                    <h2>${artist.name}</h2>
                    <div class="artist-meta">
                        <span><i class="fas fa-calendar-alt"></i> Créé en ${artist.creationDate}</span>
                        <span><i class="fas fa-compact-disc"></i> 1er album: ${artist.firstAlbum}</span>
                    </div>
                </div>
            </div>
            
            <div class="artist-detail-body">
                <div class="detail-section">
                    <h3><i class="fas fa-users"></i> Membres</h3>
                    <div class="members-list">${membersList}</div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-map-marked-alt"></i> Concerts</h3>
                    <div class="concerts-list">${concertsList}</div>
                </div>
            </div>
            
            <div class="artist-detail-footer">
                <a href="/artist?id=${artist.id}" class="btn-detail secondary">
                    <i class="fas fa-external-link-alt"></i> Page complète
                </a>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Animation d'entrée
    requestAnimationFrame(() => modal.classList.add('is-open'));
    
    // Fermer avec Escape
    const escHandler = (e) => {
        if (e.key === 'Escape') closeArtistDetailsModal();
    };
    document.addEventListener('keydown', escHandler);
    modal.dataset.escHandler = 'true';
};

window.closeArtistDetailsModal = function() {
    const modal = document.getElementById('artist-details-modal');
    if (modal) {
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
};

// Fonction globale pour acheter un billet depuis la carte (ouvre le système de booking)
window.buyTicketFromMap = function(artistDataEncoded, concertDataEncoded) {
    const artist = JSON.parse(decodeURIComponent(artistDataEncoded));
    const concert = JSON.parse(decodeURIComponent(concertDataEncoded));
    
    // Fermer les popups de carte
    if (window.globalMap) window.globalMap.closePopup();
    if (window.concertsMap) window.concertsMap.closePopup();
    
    // Vérifier si le système de booking est disponible
    if (typeof openBookingModal === 'function') {
        // Préparer les données pour le modal de booking
        const dates = concert.dates || [];
        const firstDate = dates[0] || '';
        
        const concertData = {
            artistId: artist.id,
            artistName: artist.name,
            artistImage: artist.image,
            location: concert.displayLocation || concert.location || 'Lieu inconnu',
            city: '',
            country: '',
            date: firstDate,
            dateFormatted: formatDateForBooking(firstDate),
            time: '20:00',
            price: 45,
            allDates: dates
        };
        
        openBookingModal(concertData);
    } else {
        // Fallback: rediriger vers la page artiste
        window.location.href = `/artist?id=${artist.id}`;
    }
};

function formatDateForBooking(dateStr) {
    if (!dateStr) return 'Date à confirmer';
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

// Fonction de notification
function showNotification(message, type = 'info') {
    // Supprimer les notifications existantes
    document.querySelectorAll('.map-notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `map-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Suppression automatique
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refresh-btn");
  if (refreshButton) {
    refreshButton.addEventListener("click", handleRefreshClick);
  }

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mainNav = document.querySelector(".main-nav");
  
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", !isExpanded);
      mainNav.classList.toggle("active");
      document.body.classList.toggle("menu-open");
      
      menuToggle.classList.toggle("is-active");
    });
  }

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const headerHeight = 80;
          const extraOffset = 40;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = targetPosition - headerHeight - extraOffset;
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
          
          document.querySelectorAll('.main-nav a').forEach(navLink => {
            navLink.classList.remove('active');
          });
          link.classList.add('active');
          
          if ((targetId === 'map' && window.globalMap) || (targetId === 'concerts' && window.concertsMap)) {
            setTimeout(() => {
              if (targetId === 'map' && window.globalMap) {
                window.globalMap.invalidateSize();
              }
              if (targetId === 'concerts' && window.concertsMap) {
                window.concertsMap.invalidateSize();
              }
            }, 300);
          }
        } else {
          console.warn(`Élément avec l'ID "${targetId}" introuvable`);
        }
      }
      
      if (window.innerWidth <= 992) {
        const menuToggle = document.querySelector("[data-menu-toggle]");
        if (menuToggle) menuToggle.click();
      }
    });
  });
  
  if (window.location.pathname === '/' || window.location.pathname === '') {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPosition = window.scrollY;
        const headerHeight = 80;
        const offset = headerHeight + 100;
        
        const sections = [
          { id: 'map', href: '#map' },
          { id: 'artists-panel', href: '#artists-panel' },
          { id: 'concerts', href: '#concerts' },
          { id: 'statistiques', href: '#statistiques' }
        ];
        
        let activeSection = null;
        
        for (let i = sections.length - 1; i >= 0; i--) {
          const section = document.getElementById(sections[i].id);
          if (section) {
            const sectionTop = section.getBoundingClientRect().top + window.pageYOffset;
            
            if (scrollPosition + offset >= sectionTop - 150) {
              activeSection = sections[i];
              break;
            }
          }
        }
        
        document.querySelectorAll('.main-nav a').forEach(link => {
          link.classList.remove('active');
          
          if (scrollPosition < 100) {
            if (link.getAttribute('href') === '/' || link.getAttribute('href') === '') {
              link.classList.add('active');
            }
          } else if (activeSection) {
            if (link.getAttribute('href') === activeSection.href) {
              link.classList.add('active');
            }
          }
        });
      }, 100);
    });
  }

  const header = document.querySelector('.site-header');
  if (header) {
    let lastScroll = 0;
    const handleScroll = debounce(() => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll <= 0) {
        header.classList.remove("scroll-up");
        return;
      }
      
      if (currentScroll > lastScroll && !header.classList.contains("scroll-down")) {
        header.classList.remove("scroll-up");
        header.classList.add("scroll-down");
      } else if (currentScroll < lastScroll && header.classList.contains("scroll-down")) {
        header.classList.remove("scroll-down");
        header.classList.add("scroll-up");
      }
      
      lastScroll = currentScroll;
      
      header.classList.toggle("scrolled", window.scrollY > 50);
    }, 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  initTooltips();

  initScrollAnimations();
});

async function handleRefreshClick(event) {
  const button = event.currentTarget;
  
  if (button.disabled) return;
  
  const originalContent = button.innerHTML;
  const originalWidth = button.offsetWidth;
  
  button.style.minWidth = `${originalWidth}px`;
  button.disabled = true;
  button.classList.add("is-loading");
  button.innerHTML = `
    <span class="spinner"></span>
    <span>Mise à jour en cours...</span>
  `;
  
  try {
    const endpoint = button.dataset.endpoint || "/api/refresh";
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    button.classList.add("is-success");
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>Données actualisées !</span>
    `;
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
  } catch (error) {
    console.error("Erreur lors du rafraîchissement des données:", error);
    
    button.classList.add("is-error");
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>Erreur, réessayer</span>
    `;
    
    setTimeout(() => {
      resetButton(button, originalContent);
    }, 3000);
  }
}

function resetButton(button, originalContent) {
  button.disabled = false;
  button.classList.remove("is-loading", "is-success", "is-error");
  button.innerHTML = originalContent;
  button.style.minWidth = '';
}

function initTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    const tooltipText = element.getAttribute('data-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    
    const position = element.getAttribute('data-tooltip-pos') || 'top';
    tooltip.classList.add(`tooltip--${position}`);
    
    element.appendChild(tooltip);
    
    element.addEventListener('mouseenter', () => {
      tooltip.classList.add('is-visible');
    });
    
    element.addEventListener('mouseleave', () => {
      tooltip.classList.remove('is-visible');
    });
  });
}

function initScrollAnimations() {
  const animateOnScroll = (elements, threshold = 0.15) => {
    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => {
        element.style.opacity = 1;
        element.style.transform = 'translateY(0)';
      });
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold });
    
    elements.forEach(element => {
      observer.observe(element);
    });
  };
  
  const artistCards = document.querySelectorAll('.artist-card');
  if (artistCards.length > 0) {
    animateOnScroll(artistCards);
  }
  
  const sections = document.querySelectorAll('section');
  if (sections.length > 0) {
    animateOnScroll(sections, 0.1);
  }
}

function setupTabs() {
  const tabContainers = document.querySelectorAll('.tabs');
  
  tabContainers.forEach(container => {
    const tabs = container.querySelectorAll('[role="tab"]');
    const tabPanels = container.querySelectorAll('[role="tabpanel"]');
    
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
        tabPanels.forEach(p => p.hidden = true);
        
        tab.setAttribute('aria-selected', 'true');
        const panelId = tab.getAttribute('aria-controls');
        if (panelId) {
          const panel = document.getElementById(panelId);
          if (panel) panel.hidden = false;
        } else if (tabPanels[index]) {
          tabPanels[index].hidden = false;
        }
      });
    });
    
    if (tabs[0]) {
      tabs[0].click();
    }
  });
}

document.addEventListener('DOMContentLoaded', setupTabs);

// Fonction utilitaire pour attendre que Leaflet soit chargé
function waitForLeaflet(callback, maxAttempts = 100) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        if (typeof L !== 'undefined' && typeof L.map === 'function') {
            clearInterval(checkInterval);
            callback();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('Leaflet non disponible après ' + maxAttempts + ' tentatives');
        }
    }, 50);
}

// Exposer globalement
window.waitForLeaflet = waitForLeaflet;

