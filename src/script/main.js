const PRODUCTS_URL = '/src/database/products.json';
const productsContainer = document.getElementById('products');
const searchInput = document.getElementById('search');
const cartButton = document.getElementById('cart-button');
const cartCountEl = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const closeCartBtn = document.getElementById('close-cart');
const clearCartBtn = document.getElementById('clear-cart');
const checkoutBtn = document.getElementById('checkout');
const resetFiltersBtn = document.getElementById('reset-filters-search');

let products = [];
let cart = JSON.parse(localStorage.getItem('lowa_cart') || '{}');
let currentFilters = {
  search: '',
  category: null,
  subcategory: null,
  collection: null
};

function saveCart(){
  localStorage.setItem('lowa_cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount(){
  const count = Object.values(cart).reduce((s,v)=>s+v.quantity,0);
  cartCountEl.textContent = count;
}

async function loadProducts(){
  try{
    const res = await fetch(PRODUCTS_URL);
    products = await res.json();
  }catch(e){
    console.warn('Impossible de charger products.json, fallback to sample', e);
    products = [];
  }
  renderProducts();
}

function renderProducts(list){
  const toRender = Array.isArray(list) ? list : products;
  if(!productsContainer) return;
  const frag = document.createDocumentFragment();
  toRender.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'product';
    card.setAttribute('role','listitem');
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}"/>
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <div class="meta">
        <div class="price">${p.price.toFixed(2)} €</div>
        <button class="btn add" data-id="${p.id}">Ajouter</button>
      </div>
    `;
    frag.appendChild(card);
  });
  productsContainer.replaceChildren(frag);
}

function applyFilter(q){
  currentFilters.search = q || '';
  applyAllFilters();
}

function applyAllFilters(){
  let filtered = [...products];
  
  // Filtre de recherche - ONLY by product name
  if(currentFilters.search){
    const s = currentFilters.search.trim().toLowerCase();
    filtered = filtered.filter(p => {
      return (p.name && p.name.toLowerCase().includes(s)) || 
             String(p.id) === s;
    });
  }
  
  // Filtre par catégorie
  if(currentFilters.category){
    filtered = filtered.filter(p => p.category === currentFilters.category);
  }
  
  // Filtre par sous-catégorie
  if(currentFilters.subcategory){
    filtered = filtered.filter(p => p.subcategory === currentFilters.subcategory);
  }
  
  // Filtre par collection
  if(currentFilters.collection){
    filtered = filtered.filter(p => p.collection === currentFilters.collection);
  }
  
  renderProducts(filtered);
}

function setFilter(type, value){
  if(type === 'category'){
    currentFilters.category = value;
    currentFilters.subcategory = null; // Reset subcategory when changing category
  } else if(type === 'subcategory'){
    currentFilters.subcategory = value;
  } else if(type === 'collection'){
    currentFilters.collection = value;
  }
  applyAllFilters();
}

function resetFilters(){
  currentFilters = {
    search: '',
    category: null,
    subcategory: null,
    collection: null
  };
  if(searchInput) searchInput.value = '';
  applyAllFilters();
}

function addToCart(id){
  const prod = products.find(p=>String(p.id)===String(id));
  if(!prod) return;
  if(!cart[id]) cart[id] = { ...prod, quantity:0 };
  cart[id].quantity += 1;
  saveCart();
  renderCart();
}

function renderCart(){
  const items = Object.values(cart);
  if(items.length===0){
    cartItemsEl.innerHTML = '<p>Votre panier est vide.</p>';
    cartTotalEl.textContent = '0.00';
    return;
  }
  let total = 0;
  const html = items.map(item=>{
    total += item.price * item.quantity;
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" />
        <div class="info">
          <div class="title">${item.name}</div>
          <div class="qty">Qté: <button class="btn small dec" data-id="${item.id}">-</button> <span class="q">${item.quantity}</span> <button class="btn small inc" data-id="${item.id}">+</button></div>
          <div class="price">${(item.price * item.quantity).toFixed(2)} €</div>
        </div>
        <button class="btn remove" data-id="${item.id}">Supprimer</button>
      </div>`;
  }).join('');
  cartItemsEl.innerHTML = html;
  cartTotalEl.textContent = total.toFixed(2);
}

function changeQuantity(id,delta){
  if(!cart[id]) return;
  cart[id].quantity += delta;
  if(cart[id].quantity <= 0) delete cart[id];
  saveCart();
  renderCart();
}

function removeItem(id){
  delete cart[id];
  saveCart();
  renderCart();
}

function clearCart(){
  cart = {};
  saveCart();
  renderCart();
}

function openCart(){
  cartModal.setAttribute('aria-hidden','false');
  renderCart();
}
function closeCart(){
  cartModal.setAttribute('aria-hidden','true');
}

cartButton.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
clearCartBtn.addEventListener('click', ()=>{ clearCart(); });
checkoutBtn.addEventListener('click', ()=>{

  if(Object.keys(cart).length===0){alert('Votre panier est vide.');return}
  alert('Merci ! Simulation de commande effectuée.');
  clearCart();
  closeCart();
});


cartModal.addEventListener('click', (e)=>{ if(e.target===cartModal) closeCart(); });

// Event delegation to reduce listener count
productsContainer?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.btn.add');
  if(!btn) return;
  addToCart(btn.dataset.id);
});

cartItemsEl?.addEventListener('click', (e)=>{
  const target = e.target;
  if(!(target instanceof HTMLElement)) return;
  const id = target.dataset.id;
  if(!id) return;
  if(target.classList.contains('inc')) return changeQuantity(id,1);
  if(target.classList.contains('dec')) return changeQuantity(id,-1);
  if(target.classList.contains('remove')) return removeItem(id);
});

updateCartCount();
loadProducts();

if(searchInput){
  let timeout;
  searchInput.addEventListener('input', (e)=>{
    const v = e.target.value;
  
    clearTimeout(timeout);
    timeout = setTimeout(()=> applyFilter(v), 150);
  });
}

// Gestion des filtres de catégories
document.addEventListener('click', function(e){
  const filterEl = e.target.closest('[data-filter]');
  if(filterEl && filterEl.dataset.filter && filterEl.dataset.value !== undefined){
    e.preventDefault();
    const filterType = filterEl.dataset.filter;
    const filterValue = filterEl.dataset.value;
    setFilter(filterType, filterValue);
  }
});

// Reset filters
if(resetFiltersBtn){
  resetFiltersBtn.addEventListener('click', resetFilters);
}

window.__LOWA = { cart, products, currentFilters };

// User tracking and recommendations
async function trackUserActivity() {
  const sessionToken = localStorage.getItem('sessionToken');
  if (!sessionToken) return; // Only track authenticated users
  
  const activity = {
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
    viewedProducts: Object.keys(cart).length > 0 ? Object.keys(cart) : [],
    cartValue: Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };
  
  // Store activity in localStorage for local recommendations
  const userActivity = JSON.parse(localStorage.getItem('lowa_activity') || '[]');
  userActivity.push(activity);
  // Keep last 50 activities
  if (userActivity.length > 50) userActivity.shift();
  localStorage.setItem('lowa_activity', JSON.stringify(userActivity));
  
  // Optional: Send tracking data to backend if available
  // This can be extended later to sync with /api/user-activity endpoint
}

// Track on page load
window.addEventListener('load', trackUserActivity);

// Get personalized recommendations based on user history
function getRecommendations() {
  const activity = JSON.parse(localStorage.getItem('lowa_activity') || '[]');
  if (activity.length === 0) return products.slice(0, 5); // Return first 5 if no history
  
  // Find most viewed categories/products
  const viewedIds = activity
    .flatMap(a => a.viewedProducts)
    .reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
  
  // Recommend similar items
  const recommended = products.filter(p => {
    const viewedProducts = activity.flatMap(a => a.viewedProducts);
    if (viewedProducts.includes(String(p.id))) return false;
    
    // Find products similar to viewed ones
    const viewedProds = products.filter(prod => viewedProducts.includes(String(prod.id)));
    return viewedProds.some(vp => vp.category === p.category || vp.collection === p.collection);
  });
  
  return recommended.length > 0 ? recommended.slice(0, 5) : products.slice(0, 5);
}

// Make recommendations available globally
window.__LOWA.getRecommendations = getRecommendations;
