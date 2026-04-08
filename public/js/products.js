/**
 * LOWA - Products Module
 * Chargement et affichage des produits
 */

let products = [];
let filteredProducts = [];
let currentPage = 1;
let sortOrder = 'default';

const FIRST_PRODUCT_HOMEPAGE_IMAGE = '/public/images/T_shirt BIO_Naturel(0).webp';
const PULL_RECYCLE_GRIS_HOMEPAGE_IMAGE = '/public/images/Pull_recyclé_Gris(0).webp';
const PANTALON_ECO_KAKI_HOMEPAGE_IMAGE = '/public/images/Pantalon_éco_Kaki(0).jpg';
const VESTE_LIN_BEIGE_HOMEPAGE_IMAGE = '/public/images/Veste_en_Lin_Beige(0).webp';
const ROBE_ETE_BLANC_CASSE_HOMEPAGE_IMAGE = '/public/images/Robe_d\'été_Blanc_cassé(0).webp';

function isBioNaturelTshirt(product) {
  const name = String(product?.name || '').toLowerCase();
  const image = String(product?.image || '').toLowerCase();
  return (
    Number(product?.id) === 1
    || (name.includes('t-shirt bio') && name.includes('naturel'))
    || image.includes('tshirt-naturel.svg')
  );
}

function isPullRecycleGris(product) {
  const name = String(product?.name || '').toLowerCase();
  const image = String(product?.image || '').toLowerCase();
  return (
    Number(product?.id) === 2
    || (name.includes('pull recycl') && name.includes('gris'))
    || image.includes('pull-gris.svg')
  );
}

function isPantalonEcoKaki(product) {
  const name = String(product?.name || '').toLowerCase();
  const image = String(product?.image || '').toLowerCase();
  return (
    Number(product?.id) === 3
    || (name.includes('pantalon') && name.includes('kaki'))
    || image.includes('pantalon-kaki.svg')
  );
}

function isVesteLinBeige(product) {
  const name = String(product?.name || '').toLowerCase();
  const image = String(product?.image || '').toLowerCase();
  return (
    Number(product?.id) === 4
    || (name.includes('veste') && name.includes('lin') && name.includes('beige'))
    || image.includes('veste-lin-beige.svg')
  );
}

function isRobeEteBlancCasse(product) {
  const name = String(product?.name || '').toLowerCase();
  const image = String(product?.image || '').toLowerCase();
  return (
    Number(product?.id) === 5
    || (name.includes('robe') && name.includes('blanc cass'))
    || image.includes('robe-ete.svg')
  );
}

function normalizeHomepageProductImage(product) {
  if (!product) return product;

  const normalized = { ...product };

  if (isBioNaturelTshirt(product)) {
    normalized.image = FIRST_PRODUCT_HOMEPAGE_IMAGE;
    if (!Array.isArray(normalized.images) || normalized.images.length === 0) {
      normalized.images = [
        '/public/images/T_shirt BIO_Naturel(0).webp',
        '/public/images/T_shirt BIO_Naturel(1).webp',
        '/public/images/T_shirt BIO_Naturel(2).webp'
      ];
    }
    return normalized;
  }

  if (isPullRecycleGris(product)) {
    normalized.image = PULL_RECYCLE_GRIS_HOMEPAGE_IMAGE;
    if (!Array.isArray(normalized.images) || normalized.images.length === 0) {
      normalized.images = [
        '/public/images/Pull_recyclé_Gris(0).webp',
        '/public/images/Pull_recyclé_Gris(1).webp',
        '/public/images/Pull_recyclé_Gris(2).jpg'
      ];
    }
    return normalized;
  }

  if (isPantalonEcoKaki(product)) {
    normalized.image = PANTALON_ECO_KAKI_HOMEPAGE_IMAGE;
    if (!Array.isArray(normalized.images) || normalized.images.length === 0) {
      normalized.images = [
        '/public/images/Pantalon_éco_Kaki(0).jpg',
        '/public/images/Pantalon_éco_Kaki(1).jpg',
        '/public/images/Pantalon_éco_Kaki(2).jpg'
      ];
    }
    return normalized;
  }

  if (isVesteLinBeige(product)) {
    normalized.image = VESTE_LIN_BEIGE_HOMEPAGE_IMAGE;
    if (!Array.isArray(normalized.images) || normalized.images.length === 0) {
      normalized.images = [
        '/public/images/Veste_en_Lin_Beige(0).webp',
        '/public/images/Veste_en_Lin_Beige(1).webp',
        '/public/images/Veste_en_Lin_Beige(2).avif'
      ];
    }
    return normalized;
  }

  if (isRobeEteBlancCasse(product)) {
    normalized.image = ROBE_ETE_BLANC_CASSE_HOMEPAGE_IMAGE;
    if (!Array.isArray(normalized.images) || normalized.images.length === 0) {
      normalized.images = [
        '/public/images/Robe_d\'été_Blanc_cassé(0).webp',
        '/public/images/Robe_d\'été_Blanc_cassé(1).webp',
        '/public/images/Robe_d\'été_Blanc_cassé(2).webp'
      ];
    }
    return normalized;
  }

  return normalized;
}

function normalizeHomepageProducts(items) {
  return (items || []).map(normalizeHomepageProductImage);
}

function openProductDetail(productId) {
  if (!productId) return;
  window.location.href = `/public/pages/product-detail.html?id=${encodeURIComponent(productId)}`;
}

function attachProductNavigationListeners() {
  document.querySelectorAll('.product').forEach((card) => {
    const productId = card.dataset.id;
    if (!productId) return;

    card.style.cursor = 'pointer';
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Voir le détail du produit ${productId}`);

    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart') || e.target.closest('.fav-btn') || e.target.closest('a') || e.target.closest('button')) {
        return;
      }
      openProductDetail(productId);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('.add-to-cart') || e.target.closest('.fav-btn') || e.target.closest('button')) {
        return;
      }
      e.preventDefault();
      openProductDetail(productId);
    });
  });
}

const FALLBACK_PRODUCTS = [
  {"id":1,"name":"T-shirt BIO - Naturel","price":29.00,"description":"T-shirt en coton biologique certifié. Coupe confortable, coloris naturels.","image":"/public/images/T_shirt BIO_Naturel(0).webp","images":["/public/images/T_shirt BIO_Naturel(0).webp","/public/images/T_shirt BIO_Naturel(1).webp","/public/images/T_shirt BIO_Naturel(2).webp"],"category":"hommes","subcategory":"t-shirts","collection":"eco"},
  {"id":2,"name":"Pull recyclé - Gris","price":79.00,"description":"Pull fabriqué à partir de fibres recyclées. Chaud et durable.","image":"/public/images/Pull_recyclé_Gris(0).webp","images":["/public/images/Pull_recyclé_Gris(0).webp","/public/images/Pull_recyclé_Gris(1).webp","/public/images/Pull_recyclé_Gris(2).jpg"],"category":"hommes","subcategory":"vestes","collection":"recycle"},
  {"id":3,"name":"Pantalon éco - Kaki","price":59.00,"description":"Pantalon en tissu certifié avec renforts minimalistes.","image":"/public/images/Pantalon_éco_Kaki(0).jpg","images":["/public/images/Pantalon_éco_Kaki(0).jpg","/public/images/Pantalon_éco_Kaki(1).jpg","/public/images/Pantalon_éco_Kaki(2).jpg"],"category":"hommes","subcategory":"pantalons","collection":"eco"},
  {"id":4,"name":"Veste en Lin - Beige","price":89.00,"description":"Veste légère en lin naturel, parfaite pour la mi-saison. Coupe ajustée.","image":"/public/images/Veste_en_Lin_Beige(0).webp","images":["/public/images/Veste_en_Lin_Beige(0).webp","/public/images/Veste_en_Lin_Beige(1).webp","/public/images/Veste_en_Lin_Beige(2).avif"],"category":"femmes","subcategory":"vestes","collection":"classiques"},
  {"id":5,"name":"Robe d'été - Blanc cassé","price":65.00,"description":"Robe fluide en coton bio, idéale pour l'été. Fabrication locale.","image":"/public/images/Robe_d\'été_Blanc_cassé(0).webp","images":["/public/images/Robe_d\'été_Blanc_cassé(0).webp","/public/images/Robe_d\'été_Blanc_cassé(1).webp","/public/images/Robe_d\'été_Blanc_cassé(2).webp"],"category":"femmes","subcategory":"robes","collection":"eco"},
  {"id":6,"name":"Top en fibres recyclées - Rose","price":35.00,"description":"Top féminin fabriqué à partir de bouteilles plastiques recyclées.","image":"/public/images/top-rose.svg","category":"femmes","subcategory":"tops","collection":"recycle"},
  {"id":7,"name":"Jupe midi - Marine","price":55.00,"description":"Jupe mi-longue en coton bio certifié GOTS. Coupe élégante.","image":"/public/images/jupe-marine.svg","category":"femmes","subcategory":"robes","collection":"classiques"},
  {"id":8,"name":"Chemise lin - Blanc","price":49.00,"description":"Chemise intemporelle en lin français. Production éthique.","image":"/public/images/chemise-lin.svg","category":"hommes","subcategory":"t-shirts","collection":"classiques"},
  {"id":9,"name":"Sac en toile recyclée - Noir","price":25.00,"description":"Sac cabas en toile recyclée, résistant et pratique au quotidien.","image":"/public/images/sac-recyc.svg","category":"femmes","subcategory":"accessoires","collection":"recycle"},
  {"id":10,"name":"Écharpe en laine bio - Camel","price":39.00,"description":"Écharpe douce en laine biologique. Teinture végétale.","image":"/public/images/echarpe.svg","category":"femmes","subcategory":"accessoires","collection":"eco"},
  {"id":11,"name":"Pantalon chino - Sable","price":69.00,"description":"Chino en coton bio, coupe moderne et confortable.","image":"/public/images/chino-sable.svg","category":"hommes","subcategory":"pantalons","collection":"classiques"},
  {"id":12,"name":"Blouson recyclé - Bleu nuit","price":95.00,"description":"Blouson fabriqué à partir de fibres recyclées. Design urbain.","image":"/public/images/blouson-bleu.svg","category":"hommes","subcategory":"vestes","collection":"recycle"},
  {"id":13,"name":"Sweat organique - Écru","price":59.00,"description":"Sweat doux en coton organique, intérieur gratté, coupe unisexe.","image":"/public/images/pull-gris.svg","category":"hommes","subcategory":"t-shirts","collection":"eco"},
  {"id":14,"name":"Parka imperméable recyclée","price":129.00,"description":"Parka longue, membrane recyclée, coutures étanchées, capuche ajustable.","image":"/public/images/blouson-bleu.svg","category":"femmes","subcategory":"vestes","collection":"recycle"},
  {"id":15,"name":"Cardigan laine bio - Olive","price":72.00,"description":"Cardigan en laine biologique, maille perlée, boutons en corozo.","image":"/public/images/veste-lin-beige.svg","category":"femmes","subcategory":"vestes","collection":"classiques"},
  {"id":16,"name":"Short en coton bio - Sable","price":39.00,"description":"Short léger en sergé de coton bio, taille ajustable, poches latérales.","image":"/public/images/chino-sable.svg","category":"hommes","subcategory":"pantalons","collection":"eco"},
  {"id":17,"name":"Robe cache-cœur - Terracotta","price":79.00,"description":"Robe cache-cœur en viscose EcoVero, ceinture à nouer, manches 3/4.","image":"/public/images/robe-ete.svg","category":"femmes","subcategory":"robes","collection":"classiques"},
  {"id":18,"name":"Doudoune légère recyclée","price":139.00,"description":"Doudoune compressible en fibres recyclées, chaleur 4 saisons.","image":"/public/images/blouson-bleu.svg","category":"hommes","subcategory":"vestes","collection":"recycle"}
];

/**
 * Charger les produits avec cache et fallback
 */
async function loadProducts() {
  const oneHour = 60 * 60 * 1000;
  const cached = localStorage.getItem(LOWA.STORAGE.CACHE_KEY);
  const cacheTime = localStorage.getItem(LOWA.STORAGE.CACHE_TIME_KEY);
  const cacheVersion = localStorage.getItem(LOWA.STORAGE.CACHE_VERSION_KEY);
  const hasFreshCache = cached && cacheTime && cacheVersion === LOWA.STORAGE.CACHE_VERSION && (Date.now() - parseInt(cacheTime)) < oneHour;

  showSkeleton();
  let apiSuccess = false;

  // Try Supabase first
  try {
    console.log('🌐 Fetching products from Supabase...');
    const supabaseClient = initSupabase();
    
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log('✅ Supabase returned', data.length, 'products');
        products = normalizeHomepageProducts(data);
        filteredProducts = [...products];
        renderAllProducts();
        localStorage.setItem(LOWA.STORAGE.CACHE_KEY, JSON.stringify(products));
        localStorage.setItem(LOWA.STORAGE.CACHE_TIME_KEY, Date.now().toString());
        localStorage.setItem(LOWA.STORAGE.CACHE_VERSION_KEY, LOWA.STORAGE.CACHE_VERSION);
        apiSuccess = true;
        return;
      }
    }
    throw new Error('Empty Supabase response');
  } catch (apiErr) {
    console.warn('⚠️ Supabase failed:', apiErr.message);
  }

  // Fallback to cache
  if (hasFreshCache && !apiSuccess) {
    try {
      console.log('📦 Fallback to cache');
      products = normalizeHomepageProducts(JSON.parse(cached));
      filteredProducts = [...products];
      renderAllProducts();
      return;
    } catch (e) {
      console.warn('⚠️ Cache parse error:', e.message);
    }
  }

  // Last resort
  console.warn('📍 Using hardcoded fallback');
  products = normalizeHomepageProducts([...FALLBACK_PRODUCTS]);
  filteredProducts = [...products];
  renderAllProducts();
}

/**
 * Afficher tous les produits
 */
function renderAllProducts() {
  const productsGrid = document.getElementById('products');
  const resultsCount = document.getElementById('results-count');
  const totalCount = document.getElementById('total-count');
  
  console.log('Products rendering', products.length, 'items');
  
  const html = products.map(product => {
    const productImage = isBioNaturelTshirt(product)
      ? FIRST_PRODUCT_HOMEPAGE_IMAGE
      : isPullRecycleGris(product)
        ? PULL_RECYCLE_GRIS_HOMEPAGE_IMAGE
        : isPantalonEcoKaki(product)
          ? PANTALON_ECO_KAKI_HOMEPAGE_IMAGE
          : isVesteLinBeige(product)
            ? VESTE_LIN_BEIGE_HOMEPAGE_IMAGE
            : isRobeEteBlancCasse(product)
              ? ROBE_ETE_BLANC_CASSE_HOMEPAGE_IMAGE
        : product.image;
    return `
    <article class="product" role="listitem" data-id="${product.id}">
      <a class="product-link-overlay" href="/public/pages/product-detail.html?id=${encodeURIComponent(product.id)}" aria-label="Voir le détail de ${product.name}"></a>
      <div class="product-image-container">
        <img src="${productImage}" alt="${product.name}" loading="lazy" width="280" height="280" onerror="window.lowaImgFallback(this)" />
        <button class="fav-btn ${isFavorite(product.id) ? 'active' : ''}" data-id="${product.id}" aria-label="Favoris" title="Favoris">❤</button>
      </div>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div class="meta">
        <span class="product-price">${formatPrice(product.price)} €</span>
        <button class="btn primary add-to-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">Ajouter</button>
      </div>
    </article>
  `;
  }).join('');
  
  productsGrid.innerHTML = html;
  resultsCount.textContent = products.length;
  totalCount.textContent = products.length;
  document.getElementById('products-empty').hidden = true;
  
  attachCartListeners();
  attachFavoriteListeners();
  attachProductNavigationListeners();
}

/**
 * Afficher les produits paginés
 */
function displayProductsPage() {
  if (!filteredProducts || filteredProducts.length === 0) {
    document.getElementById('products-empty').hidden = false;
    return;
  }
  
  const start = (currentPage - 1) * LOWA.PAGINATION.PRODUCTS_PER_PAGE;
  const end = start + LOWA.PAGINATION.PRODUCTS_PER_PAGE;
  const paginated = filteredProducts.slice(start, end);
  
  const productsGrid = document.getElementById('products');
  const resultsCount = document.getElementById('results-count');
  const totalCount = document.getElementById('total-count');
  const paginationContainer = document.getElementById('pagination-container');
  
  const collectionLabels = {
    'eco': 'Éco',
    'recycle': 'Recyclé',
    'classiques': 'Classique'
  };

  resultsCount.textContent = Math.min(currentPage * LOWA.PAGINATION.PRODUCTS_PER_PAGE, filteredProducts.length);
  totalCount.textContent = filteredProducts.length;
  
  const html = paginated.map(product => {
    const productImage = isBioNaturelTshirt(product)
      ? FIRST_PRODUCT_HOMEPAGE_IMAGE
      : isPullRecycleGris(product)
        ? PULL_RECYCLE_GRIS_HOMEPAGE_IMAGE
        : isPantalonEcoKaki(product)
          ? PANTALON_ECO_KAKI_HOMEPAGE_IMAGE
          : isVesteLinBeige(product)
            ? VESTE_LIN_BEIGE_HOMEPAGE_IMAGE
            : isRobeEteBlancCasse(product)
              ? ROBE_ETE_BLANC_CASSE_HOMEPAGE_IMAGE
        : product.image;
    return `
    <article class="product" role="listitem" data-id="${product.id}" data-category="${product.category}" data-subcategory="${product.subcategory}" data-collection="${collectionLabels[product.collection] || product.collection}">
      <a class="product-link-overlay" href="/public/pages/product-detail.html?id=${encodeURIComponent(product.id)}" aria-label="Voir le détail de ${product.name}"></a>
      <div class="product-image-container">
        <img src="${productImage}" alt="${product.name}" loading="lazy" width="280" height="280" onerror="window.lowaImgFallback(this)" />
        <button class="fav-btn ${isFavorite(product.id) ? 'active' : ''}" data-id="${product.id}" aria-label="Ajouter aux favoris" title="Ajouter aux favoris">❤</button>
      </div>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div class="meta">
        <span class="product-price">${formatPrice(product.price)} €</span>
        <button class="btn primary add-to-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">Ajouter</button>
      </div>
    </article>
  `;
  }).join('');
  
  if (currentPage === 1) {
    productsGrid.innerHTML = html;
  } else {
    productsGrid.innerHTML += html;
  }
  
  const hasMore = (currentPage * LOWA.PAGINATION.PRODUCTS_PER_PAGE) < filteredProducts.length;
  paginationContainer.hidden = !hasMore || filteredProducts.length === 0;
  document.getElementById('products-empty').hidden = filteredProducts.length > 0;
  
  attachCartListeners();
  attachFavoriteListeners();
  attachProductNavigationListeners();
}

/**
 * Attacher les événements du panier
 */
function attachCartListeners() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!requireAuth('Connectez-vous ou créez un compte pour ajouter des articles au panier.')) {
        return;
      }
      const productId = e.target.dataset.id;
      const product = document.querySelector(`[data-id="${productId}"]`);
      if (!product) return;
      const img = product.querySelector('img');
      addToCart({
        id: productId,
        name: e.target.dataset.name,
        price: parseFloat(e.target.dataset.price),
        image: img.src
      });
      e.target.textContent = '✓ Ajouté';
      setTimeout(() => { e.target.textContent = 'Ajouter'; }, 1500);
    });
  });
}
