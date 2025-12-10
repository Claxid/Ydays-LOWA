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

let products = [];
let cart = JSON.parse(localStorage.getItem('lowa_cart') || '{}');

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
  if(!q) return renderProducts();
  const s = q.trim().toLowerCase();
  const filtered = products.filter(p => {
    return (p.name && p.name.toLowerCase().includes(s)) || (p.description && p.description.toLowerCase().includes(s)) || String(p.id) === s;
  });
  renderProducts(filtered);
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

window.__LOWA = { cart, products };
