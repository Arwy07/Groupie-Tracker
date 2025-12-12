document.addEventListener("DOMContentLoaded", () => {
  // Gestion du bouton de rafraîchissement
  const refreshButton = document.getElementById("refresh-btn");
  if (refreshButton) {
    refreshButton.addEventListener("click", handleRefreshClick);
  }

  // Gestion du menu mobile
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mainNav = document.querySelector(".main-nav");
  
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", !isExpanded);
      mainNav.classList.toggle("active");
      document.body.classList.toggle("menu-open");
      
      // Animation de l'icône du menu
      menuToggle.classList.toggle("is-active");
    });
  }

  // Fermer le menu lors du clic sur un lien
  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 992) {
        document.querySelector("[data-menu-toggle]").click();
      }
    });
  });

  // Gestion du scroll pour le header
  const header = document.querySelector('.site-header');
  if (header) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll <= 0) {
        header.classList.remove("scroll-up");
        return;
      }
      
      if (currentScroll > lastScroll && !header.classList.contains("scroll-down")) {
        // Scroll vers le bas
        header.classList.remove("scroll-up");
        header.classList.add("scroll-down");
      } else if (currentScroll < lastScroll && header.classList.contains("scroll-down")) {
        // Scroll vers le haut
        header.classList.remove("scroll-down");
        header.classList.add("scroll-up");
      }
      
      lastScroll = currentScroll;
      
      // Ajout d'une classe quand on scroll pour le style du header
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }

  // Amélioration des tooltips
  initTooltips();

  // Gestion des animations au défilement
  initScrollAnimations();
});

// Fonction pour gérer le clic sur le bouton de rafraîchissement
async function handleRefreshClick(event) {
  const button = event.currentTarget;
  
  if (button.disabled) return;
  
  const originalContent = button.innerHTML;
  const originalWidth = button.offsetWidth;
  
  // Conserver la largeur du bouton pour éviter les sauts de mise en page
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
    
    // Afficher un message de succès
    button.classList.add("is-success");
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>Données actualisées !</span>
    `;
    
    // Recharger la page après un court délai
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
    
    // Réactiver le bouton après un délai
    setTimeout(() => {
      resetButton(button, originalContent);
    }, 3000);
  }
}

// Réinitialiser le bouton à son état d'origine
function resetButton(button, originalContent) {
  button.disabled = false;
  button.classList.remove("is-loading", "is-success", "is-error");
  button.innerHTML = originalContent;
  button.style.minWidth = '';
}

// Initialisation des tooltips
function initTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    const tooltipText = element.getAttribute('data-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    
    // Position par défaut
    const position = element.getAttribute('data-tooltip-pos') || 'top';
    tooltip.classList.add(`tooltip--${position}`);
    
    element.appendChild(tooltip);
    
    // Gestion des événements
    element.addEventListener('mouseenter', () => {
      tooltip.classList.add('is-visible');
    });
    
    element.addEventListener('mouseleave', () => {
      tooltip.classList.remove('is-visible');
    });
  });
}

// Initialisation des animations au défilement
function initScrollAnimations() {
  const animateOnScroll = (elements, threshold = 0.15) => {
    if (!('IntersectionObserver' in window)) {
      // Fallback pour les navigateurs qui ne supportent pas IntersectionObserver
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
  
  // Animer les cartes d'artistes
  const artistCards = document.querySelectorAll('.artist-card');
  if (artistCards.length > 0) {
    animateOnScroll(artistCards);
  }
  
  // Animer les sections
  const sections = document.querySelectorAll('section');
  if (sections.length > 0) {
    animateOnScroll(sections, 0.1);
  }
}

// Gestion des onglets
function setupTabs() {
  const tabContainers = document.querySelectorAll('.tabs');
  
  tabContainers.forEach(container => {
    const tabs = container.querySelectorAll('[role="tab"]');
    const tabPanels = container.querySelectorAll('[role="tabpanel"]');
    
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        // Désactiver tous les onglets et panneaux
        tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
        tabPanels.forEach(p => p.hidden = true);
        
        // Activer l'onglet cliqué
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
    
    // Activer le premier onglet par défaut
    if (tabs[0]) {
      tabs[0].click();
    }
  });
}

// Initialiser les onglets lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', setupTabs);

