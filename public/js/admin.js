// Admin Dashboard with API Integration
const API_BASE_URL = 'https://lowa-api.onrender.com/api';

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

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'admin@lowa.com', // Email admin par défaut
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                const userRole = data.user ? data.user.role : data.role;
                if (userRole === 'admin') {
                    localStorage.setItem('adminToken', data.token);
                    showDashboard();
                    errorMsg.textContent = '';
                } else {
                    errorMsg.textContent = '❌ Accès refusé: compte non-admin';
                }
            } else {
                errorMsg.textContent = '❌ Identifiants incorrects';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMsg.textContent = '❌ Erreur de connexion';
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
            const response = await fetch(`${API_BASE_URL}/products`, {
                headers: {
                    'Authorization': token
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            
            const products = await response.json();
            document.getElementById('products-count').textContent = products.length;
            displayProducts(products);
            
            // Load maintenance mode status
            loadMaintenanceModeStatus();
        } catch (error) {
            console.error('Erreur chargement produits:', error);
            document.getElementById('products-list').innerHTML = '<p>Erreur de chargement</p>';
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
                response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify(product)
                });
            } else {
                // Create new product
                response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify(product)
                });
            }
            
            if (response.ok) {
                productModal.style.display = 'none';
                invalidateProductsCache();
                loadDashboardData();
                alert(productId ? '✅ Produit modifié avec succès' : '✅ Produit ajouté avec succès');
            } else {
                const error = await response.json();
                alert('❌ Erreur: ' + (error.error || 'Impossible de sauvegarder le produit'));
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
            const response = await fetch(`${API_BASE_URL}/products?id=${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token
                }
            });
            
            if (response.ok) {
                alert('✅ Produit supprimé avec succès');
                invalidateProductsCache();
                loadDashboardData();
            } else {
                const error = await response.json();
                alert('❌ Erreur: ' + (error.error || 'Impossible de supprimer le produit'));
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
            const response = await fetch(`${API_BASE_URL}/maintenance-mode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({ enabled: isEnabled })
            });
            
            if (response.ok) {
                alert(isEnabled ? '✅ Mode maintenance activé' : '✅ Mode maintenance désactivé');
            } else {
                const error = await response.json();
                alert('❌ Erreur: ' + (error.error || 'Impossible de modifier le mode maintenance'));
                e.target.checked = !isEnabled;
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
            .catch(err => console.error('Failed to load maintenance status:', err));
        } catch (error) {
            console.error('Error loading maintenance status:', error);
        }
    }
});
