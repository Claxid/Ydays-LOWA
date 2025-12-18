// Admin Dashboard
const ADMIN_PASSWORD = 'admin123'; // À changer en production avec une vraie API

document.addEventListener('DOMContentLoaded', () => {
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

    function checkAdminSession() {
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession && isSessionValid(adminSession)) {
            showDashboard();
        } else {
            showLogin();
        }
    }

    function isSessionValid(session) {
        try {
            const data = JSON.parse(session);
            return data.timestamp && (Date.now() - data.timestamp < 24 * 60 * 60 * 1000); // 24h
        } catch {
            return false;
        }
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
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;
        const errorMsg = document.getElementById('login-error');

        if (password === ADMIN_PASSWORD) {
            localStorage.setItem('adminSession', JSON.stringify({ timestamp: Date.now() }));
            showDashboard();
            errorMsg.textContent = '';
        } else {
            errorMsg.textContent = '❌ Mot de passe incorrect';
            document.getElementById('admin-password').value = '';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminSession');
        showLogin();
        loginForm.reset();
    });

    // Load Dashboard
    async function loadDashboardData() {
        try {
            const response = await fetch('/data/products.json');
            const products = await response.json();
            document.getElementById('products-count').textContent = products.length;
            displayProducts(products);
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
            btn.addEventListener('click', () => editProduct(products.find(p => p.id === btn.dataset.id)));
        });
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Confirmer la suppression ?')) {
                    deleteProduct(btn.dataset.id);
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
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const productId = productForm.dataset.productId;
        const product = {
            id: productId || Date.now().toString(),
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            image: document.getElementById('product-image').value
        };
        
        alert('Produit sauvegardé (intégration API requise)');
        productModal.style.display = 'none';
        loadDashboardData();
    });

    function editProduct(product) {
        document.getElementById('modal-title').textContent = 'Éditer le produit';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-image').value = product.image;
        productForm.dataset.productId = product.id;
        productModal.style.display = 'flex';
    }

    function deleteProduct(productId) {
        alert('Produit supprimé (intégration API requise)');
        loadDashboardData();
    }
});
