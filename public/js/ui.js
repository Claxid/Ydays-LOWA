/**
 * LOWA - UI Module
 * Gestion de l'interface utilisateur (header, navigation, etc.)
 */

/**
 * Initialiser l'UI
 */
function initUI() {
  initBurgerMenu();
  initDropdownMenu();
  initScrollToTop();
  initMobileDock();
}

function initMobileDock() {
  const dock = document.querySelector('.mobile-dock');
  const mobileCartBtn = document.getElementById('mobile-cart-btn');
  const mobileCategoriesBtn = document.getElementById('mobile-categories-btn');
  const mobileAccountBtn = document.getElementById('mobile-account-btn');
  const mobileCartCount = document.getElementById('mobile-cart-count');

  if (!dock || (!mobileCartBtn && !mobileCategoriesBtn && !mobileAccountBtn)) return;

  const isTouchMobile = window.matchMedia('(max-width: 900px) and (hover: none)').matches ||
    window.matchMedia('(max-width: 700px)').matches;

  if (isTouchMobile) {
    dock.hidden = false;
    document.body.classList.add('has-mobile-dock');
  } else {
    dock.hidden = true;
    document.body.classList.remove('has-mobile-dock');
    return;
  }

  const desktopCartButton = document.getElementById('cart-button');
  const desktopCartCount = document.getElementById('cart-count');
  const desktopUserButton = document.getElementById('user-menu-btn');

  if (mobileCartBtn && desktopCartButton) {
    mobileCartBtn.addEventListener('click', () => {
      desktopCartButton.click();
    });
  }

  if (mobileCategoriesBtn) {
    mobileCategoriesBtn.addEventListener('click', () => {
      const target = document.querySelector('.category-row') || document.getElementById('products-heading');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (mobileAccountBtn) {
    mobileAccountBtn.addEventListener('click', () => {
      if (desktopUserButton) {
        desktopUserButton.click();
      }
    });
  }

  if (mobileCartCount && desktopCartCount) {
    const syncCount = () => {
      mobileCartCount.textContent = desktopCartCount.textContent || '0';
    };
    syncCount();
    const observer = new MutationObserver(syncCount);
    observer.observe(desktopCartCount, { childList: true, subtree: true, characterData: true });
  }
}

/**
 * Initialiser le menu hamburger
 */
function initBurgerMenu() {
  const burgerBtn = document.getElementById('burger-btn');
  const headerEl = document.querySelector('.site-header');
  
  if (!burgerBtn || !headerEl) return;
  
  burgerBtn.addEventListener('click', () => {
    const open = headerEl.classList.toggle('menu-open');
    burgerBtn.setAttribute('aria-expanded', open);
  });
}

/**
 * Initialiser les menus déroulants
 */
function initDropdownMenu() {
  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(d => {
      const btn = d.querySelector('.mainmenubtn');
      const child = d.querySelector('.dropdown-child');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (child) child.setAttribute('aria-hidden', 'true');
      d.classList.remove('open');
    });
  }

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.mainmenubtn');
    if (btn && btn.closest('.dropdown')) {
      const wrap = btn.closest('.dropdown');
      const child = wrap.querySelector('.dropdown-child');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        btn.setAttribute('aria-expanded', 'false');
        if (child) child.setAttribute('aria-hidden', 'true');
        wrap.classList.remove('open');
      } else {
        closeAllDropdowns();
        btn.setAttribute('aria-expanded', 'true');
        if (child) child.setAttribute('aria-hidden', 'false');
        wrap.classList.add('open');
      }
      e.stopPropagation();
      return;
    }
    if (!e.target.closest('.dropdown')) closeAllDropdowns();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAllDropdowns();
  });
}

/**
 * Initialiser le bouton "scroll to top"
 */
function initScrollToTop() {
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  if (!scrollToTopBtn) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollToTopBtn.classList.add('show');
    } else {
      scrollToTopBtn.classList.remove('show');
    }
  });
  
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * Initialiser les interactions de header
 */
function initHeaderHero() {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero-presentation');
  
  if (!header || !hero || root.dataset.theme !== 'noel') return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        header.classList.add('header-hidden');
      } else {
        header.classList.remove('header-hidden');
      }
    });
  }, { threshold: 0.25 });
  
  observer.observe(hero);
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initHeaderHero();
});
