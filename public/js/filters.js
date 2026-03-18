/**
 * LOWA - Filters & Sorting Module
 * Filtrage et tri des produits
 */

let activeFilters = {};
let maxPrice = 1000;

/**
 * Charger les filtres depuis le stockage
 */
function loadFiltersFromStorage() {
  const stored = (typeof scopedStorageGet === 'function')
    ? scopedStorageGet(LOWA.STORAGE.FILTER_KEY)
    : localStorage.getItem(LOWA.STORAGE.FILTER_KEY);
  if (stored) {
    try {
      const saved = JSON.parse(stored);
      activeFilters = saved.filters || {};
      maxPrice = saved.maxPrice || 1000;
      document.getElementById('price-range').value = maxPrice;
      document.getElementById('price-display').textContent = maxPrice + ' €';
      document.getElementById('search').value = activeFilters.search || '';
      document.getElementById('sort-select').value = saved.sortOrder || 'default';
      sortOrder = saved.sortOrder || 'default';
    } catch (e) {
      console.warn('Erreur chargement filtres:', e);
    }
  }
}

/**
 * Sauvegarder les filtres
 */
function saveFiltersToStorage() {
  const toSave = {
    filters: activeFilters,
    maxPrice: maxPrice,
    sortOrder: sortOrder
  };
  if (typeof scopedStorageSet === 'function') {
    scopedStorageSet(LOWA.STORAGE.FILTER_KEY, JSON.stringify(toSave));
  } else {
    localStorage.setItem(LOWA.STORAGE.FILTER_KEY, JSON.stringify(toSave));
  }
}

/**
 * Appliquer les filtres aux produits
 */
function applyFilters() {
  filteredProducts = products.filter(product => {
    if (activeFilters.search) {
      const query = activeFilters.search.toLowerCase();
      const matches = product.name.toLowerCase().includes(query) ||
                    product.description.toLowerCase().includes(query) ||
                    product.category.toLowerCase().includes(query);
      if (!matches) return false;
    }
    if (product.price > maxPrice) return false;
    if (activeFilters.category && product.category !== activeFilters.category) return false;
    if (activeFilters.subcategory && product.subcategory !== activeFilters.subcategory) return false;
    if (activeFilters.collection && product.collection !== activeFilters.collection) return false;
    return true;
  });
  updateActiveFiltersBadges();
}

/**
 * Afficher les badges des filtres actifs
 */
function updateActiveFiltersBadges() {
  const container = document.getElementById('filter-badges');
  const displayDiv = document.getElementById('active-filters');
  const badges = [];
  
  if (activeFilters.category) {
    badges.push(`<span class="filter-badge">Catégorie: ${activeFilters.category} <button data-clear="category">×</button></span>`);
  }
  if (activeFilters.subcategory) {
    badges.push(`<span class="filter-badge">Sous-catégorie: ${activeFilters.subcategory} <button data-clear="subcategory">×</button></span>`);
  }
  if (activeFilters.collection) {
    badges.push(`<span class="filter-badge">Collection: ${activeFilters.collection} <button data-clear="collection">×</button></span>`);
  }
  if (maxPrice < 200) {
    badges.push(`<span class="filter-badge">Prix: ≤${maxPrice}€ <button data-clear="price">×</button></span>`);
  }
  if (activeFilters.search) {
    badges.push(`<span class="filter-badge">Recherche: "${activeFilters.search}" <button data-clear="search">×</button></span>`);
  }
  
  if (badges.length > 0) {
    container.innerHTML = badges.join('');
    displayDiv.hidden = false;
    
    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const clearType = e.target.dataset.clear;
        if (clearType === 'price') {
          maxPrice = 1000;
          document.getElementById('price-range').value = 1000;
          document.getElementById('price-display').textContent = '1000 €';
        } else {
          delete activeFilters[clearType];
        }
        saveFiltersToStorage();
        sortAndDisplayProducts();
      });
    });
  } else {
    displayDiv.hidden = true;
  }
}

/**
 * Trier et afficher les produits
 */
function sortAndDisplayProducts() {
  applyFilters();
  
  const sorted = [...filteredProducts];
  if (sortOrder === 'price-asc') {
    sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } else if (sortOrder === 'price-desc') {
    sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  } else if (sortOrder === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  } else if (sortOrder === 'name-desc') {
    sorted.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
  }
  
  filteredProducts = sorted;
  currentPage = 1;
  displayProductsPage();
}

/**
 * Initialiser les écouteurs des filtres
 */
function initFilterListeners() {
  // Dropdown filters
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && e.target.closest('.dropdown-child') && e.target.dataset.filter) {
      e.preventDefault();
      const filterType = e.target.dataset.filter;
      const filterValue = e.target.dataset.value;
      
      if (activeFilters[filterType] === filterValue) {
        delete activeFilters[filterType];
      } else {
        activeFilters[filterType] = filterValue;
      }
      
      saveFiltersToStorage();
      sortAndDisplayProducts();
    }
  });
  
  // Sort select
  document.getElementById('sort-select').addEventListener('change', (e) => {
    sortOrder = e.target.value;
    saveFiltersToStorage();
    sortAndDisplayProducts();
  });
  
  // Search input
  document.getElementById('search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query) {
      activeFilters.search = query;
    } else {
      delete activeFilters.search;
    }
    saveFiltersToStorage();
    sortAndDisplayProducts();
  });
  
  // Reset filters
  document.getElementById('reset-filters-search').addEventListener('click', () => {
    activeFilters = {};
    sortOrder = 'default';
    maxPrice = 1000;
    document.getElementById('search').value = '';
    document.getElementById('sort-select').value = 'default';
    document.getElementById('price-range').value = '1000';
    document.getElementById('price-display').textContent = '1000 €';
    localStorage.removeItem(LOWA.STORAGE.FILTER_KEY);
    sortAndDisplayProducts();
  });
  
  // Price range slider
  document.getElementById('price-range').addEventListener('input', (e) => {
    maxPrice = parseInt(e.target.value);
    document.getElementById('price-display').textContent = maxPrice + ' €';
    saveFiltersToStorage();
    sortAndDisplayProducts();
  });
  
  // Scroll to products button
  document.getElementById('scroll-to-products').addEventListener('click', () => {
    document.getElementById('products-heading').scrollIntoView({ behavior: 'smooth' });
  });
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  initFilterListeners();
});
