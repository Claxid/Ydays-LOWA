// search.js — dropdown search suggestions for products
(function(){
  const PRODUCTS_URL = 'src/database/products.json';
  const input = document.getElementById('site-search');
  const dropdown = document.getElementById('search-dropdown');
  let products = null;
  let active = -1;

  function debounce(fn, wait=200){
    let t;
    return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
  }

  async function loadProducts(){
    if(products) return products;
    try{
      const res = await fetch(PRODUCTS_URL);
      products = await res.json();
    }catch(e){ products = []; }
    return products;
  }

  function showDropdown(items){
    dropdown.innerHTML = '';
    if(!items.length){ dropdown.setAttribute('aria-hidden','true'); dropdown.classList.remove('open'); return; }
    items.forEach((p, i)=>{
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'search-item';
      el.dataset.id = p.id;
      el.innerHTML = ` <img src="${p.image}" alt="${p.name}" /><div class="meta"><div class="name">${p.name}</div><div class="price">${p.price.toFixed(2)} €</div></div>`;
      el.addEventListener('click', ()=>{ selectItem(i); goToProduct(p.id); });
      dropdown.appendChild(el);
    });
    active = -1;
    dropdown.setAttribute('aria-hidden','false');
    dropdown.classList.add('open');
  }

  function hideDropdown(){ dropdown.setAttribute('aria-hidden','true'); dropdown.classList.remove('open'); active = -1; }

  function filter(q){
    if(!q) return [];
    const low = q.trim().toLowerCase();
    return (products||[]).filter(p=>p.name.toLowerCase().includes(low) || (p.description||'').toLowerCase().includes(low)).slice(0,6);
  }

  function goToProduct(id){
    // Try to find product card with data-id attribute and focus/scroll to it
    const card = document.querySelector(`[data-id=\"${id}\"]`);
    if(card){ card.scrollIntoView({behavior:'smooth', block:'center'}); card.focus && card.focus(); }
    hideDropdown();
  }

  function selectItem(index){
    const items = dropdown.querySelectorAll('.search-item');
    items.forEach((it,i)=> it.classList.toggle('active', i===index));
    active = index;
  }

  function onKey(e){
    const items = dropdown.querySelectorAll('.search-item');
    if(items.length===0) return;
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      const next = Math.min(items.length-1, active+1);
      selectItem(next);
      items[next].scrollIntoView({block:'nearest'});
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      const prev = Math.max(0, active-1);
      selectItem(prev);
      items[prev].scrollIntoView({block:'nearest'});
    } else if(e.key === 'Enter'){
      e.preventDefault();
      if(active>=0 && items[active]) items[active].click();
    } else if(e.key === 'Escape'){
      hideDropdown();
    }
  }

  const doSearch = debounce(async function(){
    const q = input.value;
    await loadProducts();
    const items = filter(q);
    showDropdown(items);
  }, 180);

  if(input){
    input.addEventListener('input', doSearch);
    input.addEventListener('focus', doSearch);
    input.addEventListener('keydown', onKey);
    document.addEventListener('click', (e)=>{ if(!e.composedPath().includes(dropdown) && e.target !== input) hideDropdown(); });
  }

})();
