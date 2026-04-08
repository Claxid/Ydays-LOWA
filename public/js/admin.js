// Admin Dashboard with API Integration + local fallback mode
function resolveAdminApiBase() {
    const remoteDefault = 'https://lowa-api.onrender.com/api';
    const configured = String(window.API_BASE || '').trim();
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    // Guard against stale scripts/configs forcing localhost while running on a hosted domain.
    if (!isLocalHost && configured.includes('localhost')) return remoteDefault;

    return configured || remoteDefault;
}

const API_BASE_URL = resolveAdminApiBase();
const ADMIN_LOCAL_PRODUCTS_KEY = 'lowa_admin_local_products';
const ADMIN_LOCAL_MAINTENANCE_KEY = 'lowa_admin_local_maintenance';
const ADMIN_LOCAL_DEFAULT_THEME_KEY = 'lowa_admin_local_default_theme';

const ADMIN_FALLBACK_PRODUCTS = [
    { id: 1, name: 'T-shirt BIO - Naturel', price: 29.0, category: 'hommes' },
    { id: 2, name: 'Pull recyclé - Gris', price: 79.0, category: 'hommes' },
    { id: 3, name: 'Pantalon éco - Kaki', price: 59.0, category: 'hommes' },
    { id: 4, name: 'Veste en Lin - Beige', price: 89.0, category: 'femmes' },
    { id: 5, name: "Robe d'été - Blanc cassé", price: 65.0, category: 'femmes' },
    { id: 6, name: 'Top en fibres recyclées - Rose', price: 35.0, category: 'femmes' }
];

function getLocalProducts() {
    try {
        const raw = localStorage.getItem(ADMIN_LOCAL_PRODUCTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return ADMIN_FALLBACK_PRODUCTS;
    }
}

function setLocalProducts(products) {
    localStorage.setItem(ADMIN_LOCAL_PRODUCTS_KEY, JSON.stringify(products || []));
}

function parseArrayStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function updateStats(products = []) {
    const productsCountEl = document.getElementById('products-count');
    const ordersCountEl = document.getElementById('orders-count');
    const usersCountEl = document.getElementById('users-count');

    if (productsCountEl) productsCountEl.textContent = String((products || []).length);

    // Local fallback stats sources
    const users = parseArrayStorage('lowa_local_users');
    const localOrders = parseArrayStorage('lowa_orders');
    const purchaseHistory = parseArrayStorage('lowa_purchase_history');

    if (ordersCountEl) ordersCountEl.textContent = String(Math.max(localOrders.length, purchaseHistory.length, 0));
    if (usersCountEl) usersCountEl.textContent = String(users.length);
}

async function countRows(supabaseClient, tableName) {
    try {
        const { count, error } = await supabaseClient
            .from(tableName)
            .select('id', { count: 'exact', head: true });
        if (error) return null;
        return typeof count === 'number' ? count : null;
    } catch (e) {
        return null;
    }
}

async function loadStatsFromDatabase() {
    const supabaseClient = typeof initSupabase === 'function' ? initSupabase() : null;
    if (!supabaseClient) return null;

    const [productCount, userCount] = await Promise.all([
        countRows(supabaseClient, 'products'),
        countRows(supabaseClient, 'users')
    ]);

    let orderCount = null;
    const orderTables = ['purchase_history', 'orders', 'commandes'];
    for (const tableName of orderTables) {
        orderCount = await countRows(supabaseClient, tableName);
        if (typeof orderCount === 'number') break;
    }

    return {
        products: typeof productCount === 'number' ? productCount : null,
        users: typeof userCount === 'number' ? userCount : null,
        orders: typeof orderCount === 'number' ? orderCount : null
    };
}

async function loadProductsWithFallback(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': token }
        });
        if (!response.ok) throw new Error('Remote products fetch failed');
        const products = await response.json();
        if (!Array.isArray(products)) throw new Error('Remote products payload invalid');
        setLocalProducts(products);
        return products;
    } catch (apiError) {
        const localProducts = getLocalProducts();
        if (localProducts.length > 0) return localProducts;

        const fallbackPaths = [
            '/public/data/products.json',
            './public/data/products.json',
            'public/data/products.json',
            '/products.json',
            './products.json'
        ];
        for (const path of fallbackPaths) {
            try {
                const res = await fetch(path, { cache: 'no-cache' });
                if (!res.ok) continue;
                const products = await res.json();
                if (Array.isArray(products)) {
                    setLocalProducts(products);
                    return products;
                }
            } catch (e) {}
        }

        return [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
        function invalidateProductsCache() {
            try {
                localStorage.removeItem('lowa_products_cache_time');
                // Optionally also clear the data so next visit fetches fresh
                localStorage.removeItem('lowa_products_cache');
            } catch {}
        }
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const logoutBtn = document.getElementById('logout-btn');
    const productModal = document.getElementById('product-modal');
    const modalClose = document.querySelector('.modal-close');
    const addProductBtn = document.getElementById('add-product-btn');
    const productForm = document.getElementById('product-form');

    // Check if already logged in
    checkAdminSession();

    async function checkAdminSession() {
        const token = localStorage.getItem('adminToken');
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/user`, {
                    headers: {
                        'Authorization': token
                    }
                });
                if (response.ok) {
                    const user = await response.json();
                    if (user.role === 'admin') {
                        showDashboard();
                        return;
                    }
                }
            } catch (error) {
                console.error('Session check failed:', error);
            }
            localStorage.removeItem('adminToken');
        }
        showLogin();
    }

    function showLogin() {
        loginContainer.style.display = 'flex';
        dashboardContainer.style.display = 'none';
    }

    function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        loadDashboardData();
    }

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;
        const errorMsg = document.getElementById('login-error');

        // Direct password check (admin123)
        if (password === 'admin123') {
            const token = 'admin-token-' + Date.now();
            localStorage.setItem('adminToken', token);
            showDashboard();
            errorMsg.textContent = '';
        } else {
            errorMsg.textContent = '❌ Mot de passe incorrect';
        }
        
        document.getElementById('admin-password').value = '';
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': token
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        localStorage.removeItem('adminToken');
        showLogin();
        loginForm.reset();
    });

    // Load Dashboard
    async function loadDashboardData() {
        const token = localStorage.getItem('adminToken');
        try {
            // Show a deterministic dashboard immediately so the UI is never empty.
            updateStats(ADMIN_FALLBACK_PRODUCTS);
            displayProducts(ADMIN_FALLBACK_PRODUCTS);

            const products = await loadProductsWithFallback(token);
            if (products && products.length > 0) {
                displayProducts(products);
                updateStats(products);
            }

            const dbStats = await loadStatsFromDatabase();
            if (dbStats) {
                const productsCountEl = document.getElementById('products-count');
                const ordersCountEl = document.getElementById('orders-count');
                const usersCountEl = document.getElementById('users-count');

                if (productsCountEl && typeof dbStats.products === 'number') productsCountEl.textContent = String(dbStats.products);
                if (ordersCountEl && typeof dbStats.orders === 'number') ordersCountEl.textContent = String(dbStats.orders);
                if (usersCountEl && typeof dbStats.users === 'number') usersCountEl.textContent = String(dbStats.users);
            }
            
            // Load maintenance mode status
            loadMaintenanceModeStatus();
        } catch (error) {
            console.error('Erreur chargement produits:', error);
            updateStats(ADMIN_FALLBACK_PRODUCTS);
            displayProducts(ADMIN_FALLBACK_PRODUCTS);
        }
    }

    function displayProducts(products) {
        const list = document.getElementById('products-list');
        if (products.length === 0) {
            list.innerHTML = '<p>Aucun produit</p>';
            return;
        }

        list.innerHTML = `
            <table class="products-table-data">
                <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Prix</th>
                        <th>Catégorie</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.price}€</td>
                            <td>${p.category}</td>
                            <td>
                                <button class="btn-small edit-btn" data-id="${p.id}">✏️ Éditer</button>
                                <button class="btn-small delete-btn" data-id="${p.id}">🗑️ Supprimer</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add event listeners
        list.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = parseInt(btn.dataset.id);
                const product = products.find(p => p.id === productId);
                if (product) {
                    editProduct(product);
                }
            });
        });
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Confirmer la suppression ?')) {
                    deleteProduct(parseInt(btn.dataset.id));
                }
            });
        });
    }

    // Modal
    addProductBtn.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Ajouter un produit';
        productForm.reset();
        productForm.dataset.productId = '';
        productModal.style.display = 'flex';
    });

    modalClose.addEventListener('click', () => {
        productModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.style.display = 'none';
        }
    });

    // Form submit
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        const productId = productForm.dataset.productId;
        
        const product = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            image: document.getElementById('product-image').value,
            description: document.getElementById('product-description')?.value || '',
            subcategory: document.getElementById('product-subcategory')?.value || '',
            collection: document.getElementById('product-collection')?.value || 'eco'
        };
        
        try {
            let response;
            if (productId) {
                // Update existing product
                product.id = parseInt(productId);
                try {
                    response = await fetch(`${API_BASE_URL}/products`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token
                        },
                        body: JSON.stringify(product)
                    });
                } catch (e) {
                    response = null;
                }
            } else {
                // Create new product
                try {
                    response = await fetch(`${API_BASE_URL}/products`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token
                        },
                        body: JSON.stringify(product)
                    });
                } catch (e) {
                    response = null;
                }
            }

            if (response && response.ok) {
                productModal.style.display = 'none';
                invalidateProductsCache();
                loadDashboardData();
                alert(productId ? '✅ Produit modifié avec succès' : '✅ Produit ajouté avec succès');
            } else {
                // Local fallback save
                const localProducts = getLocalProducts();
                if (productId) {
                    const pid = parseInt(productId);
                    const idx = localProducts.findIndex((p) => Number(p.id) === pid);
                    if (idx >= 0) localProducts[idx] = { ...localProducts[idx], ...product, id: pid };
                } else {
                    const maxId = localProducts.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
                    localProducts.push({ ...product, id: maxId + 1 });
                }
                setLocalProducts(localProducts);
                productModal.style.display = 'none';
                invalidateProductsCache();
                loadDashboardData();
                alert(productId ? '✅ Produit modifié (mode local)' : '✅ Produit ajouté (mode local)');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('❌ Erreur de connexion');
        }
    });

    function editProduct(product) {
        document.getElementById('modal-title').textContent = 'Éditer le produit';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-image').value = product.image;
        if (document.getElementById('product-description')) {
            document.getElementById('product-description').value = product.description || '';
        }
        if (document.getElementById('product-subcategory')) {
            document.getElementById('product-subcategory').value = product.subcategory || '';
        }
        if (document.getElementById('product-collection')) {
            document.getElementById('product-collection').value = product.collection || 'eco';
        }
        productForm.dataset.productId = product.id;
        productModal.style.display = 'flex';
    }

    async function deleteProduct(productId) {
        const token = localStorage.getItem('adminToken');
        try {
            let response = null;
            try {
                response = await fetch(`${API_BASE_URL}/products?id=${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': token
                    }
                });
            } catch (e) {
                response = null;
            }
            
            if (response && response.ok) {
                alert('✅ Produit supprimé avec succès');
                invalidateProductsCache();
                loadDashboardData();
            } else {
                const localProducts = getLocalProducts().filter((p) => Number(p.id) !== Number(productId));
                setLocalProducts(localProducts);
                invalidateProductsCache();
                loadDashboardData();
                alert('✅ Produit supprimé (mode local)');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('❌ Erreur de connexion');
        }
    }

    // Maintenance Mode Management
    const maintenanceCheckbox = document.getElementById('maintenance-mode');
    
    maintenanceCheckbox.addEventListener('change', async (e) => {
        const token = localStorage.getItem('adminToken');
        const isEnabled = e.target.checked;
        
        try {
            let response = null;
            try {
                response = await fetch(`${API_BASE_URL}/maintenance-mode`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify({ enabled: isEnabled })
                });
            } catch (e) {
                response = null;
            }
            
            if (response && response.ok) {
                alert(isEnabled ? '✅ Mode maintenance activé' : '✅ Mode maintenance désactivé');
            } else {
                localStorage.setItem(ADMIN_LOCAL_MAINTENANCE_KEY, isEnabled ? '1' : '0');
                alert(isEnabled ? '✅ Mode maintenance activé (mode local)' : '✅ Mode maintenance désactivé (mode local)');
            }
        } catch (error) {
            console.error('Error updating maintenance mode:', error);
            alert('❌ Erreur de connexion');
            e.target.checked = !isEnabled;
        }
    });

    function loadMaintenanceModeStatus() {
        const token = localStorage.getItem('adminToken');
        try {
            fetch(`${API_BASE_URL}/maintenance-mode`, {
                headers: {
                    'Authorization': token
                }
            })
            .then(res => res.json())
            .then(data => {
                maintenanceCheckbox.checked = data.enabled || false;
            })
            .catch(() => {
                maintenanceCheckbox.checked = localStorage.getItem(ADMIN_LOCAL_MAINTENANCE_KEY) === '1';
            });
        } catch (error) {
            console.error('Error loading maintenance status:', error);
            maintenanceCheckbox.checked = localStorage.getItem(ADMIN_LOCAL_MAINTENANCE_KEY) === '1';
        }
    }

    // Default Theme Management
    const defaultThemeSelect = document.getElementById('default-theme');
    const saveThemeBtn = document.getElementById('save-theme-btn');
    const themeMessage = document.getElementById('theme-message');

    if (defaultThemeSelect && saveThemeBtn) {
        // Load current default theme
        async function loadDefaultTheme() {
            const token = localStorage.getItem('adminToken');
            try {
                const response = await fetch(`${API_BASE_URL}/admin/settings/default-theme`, {
                    headers: {
                        'Authorization': token
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    defaultThemeSelect.value = data.theme || 'light';
                    localStorage.setItem(ADMIN_LOCAL_DEFAULT_THEME_KEY, defaultThemeSelect.value);
                } else {
                    defaultThemeSelect.value = localStorage.getItem(ADMIN_LOCAL_DEFAULT_THEME_KEY) || 'light';
                }
            } catch (error) {
                defaultThemeSelect.value = localStorage.getItem(ADMIN_LOCAL_DEFAULT_THEME_KEY) || 'light';
            }
        }

        saveThemeBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            const selectedTheme = defaultThemeSelect.value;

            if (!selectedTheme) {
                themeMessage.textContent = '❌ Veuillez sélectionner un thème';
                themeMessage.style.color = '#d32f2f';
                return;
            }

            saveThemeBtn.disabled = true;
            saveThemeBtn.textContent = '⏳ Enregistrement...';

            try {
                let response = null;
                try {
                    response = await fetch(`${API_BASE_URL}/admin/settings/default-theme`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token
                        },
                        body: JSON.stringify({ theme: selectedTheme })
                    });
                } catch (e) {
                    response = null;
                }

                if (response && response.ok) {
                    await response.json();
                    themeMessage.textContent = `✅ Thème par défaut changé à "${selectedTheme}" avec succès!`;
                    themeMessage.style.color = '#4caf50';
                    localStorage.setItem(ADMIN_LOCAL_DEFAULT_THEME_KEY, selectedTheme);
                    setTimeout(() => {
                        themeMessage.textContent = '';
                    }, 3000);
                } else {
                    localStorage.setItem(ADMIN_LOCAL_DEFAULT_THEME_KEY, selectedTheme);
                    themeMessage.textContent = `✅ Thème enregistré en mode local: "${selectedTheme}"`;
                    themeMessage.style.color = '#4caf50';
                }
            } catch (error) {
                console.error('Error saving default theme:', error);
                themeMessage.textContent = '❌ Erreur de connexion';
                themeMessage.style.color = '#d32f2f';
            } finally {
                saveThemeBtn.disabled = false;
                saveThemeBtn.textContent = 'Enregistrer le thème';
            }
        });

        // Load theme on page load
        loadDefaultTheme();
    }
});
