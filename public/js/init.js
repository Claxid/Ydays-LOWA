/**
 * LOWA - Main Initialization
 * Orchestration de tous les modules
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialiser dans l'ordre correct
  console.log('🚀 LOWA - Initialisation de l\'application');
  
  // 1. Charger les données
  loadProducts();
  
  // Les autres modules s'initialisent via leurs propres DOMContentLoaded
  // et leurs codes d'initialisation sont structurés dans leurs fichiers respectifs
  
  console.log('✅ LOWA - Prêt!');
});
