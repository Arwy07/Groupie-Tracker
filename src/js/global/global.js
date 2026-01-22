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

