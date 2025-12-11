# 🎨 Système de Personnalisation LOWA

## Vue d'ensemble

Le système de personnalisation avancé permet aux utilisateurs de customiser complètement leur expérience sur LOWA.

## 📋 Fonctionnalités

### 1. **Thème Visuel** (3 modes)

#### Mode Clair ☀️
- Fond clair (#f0f5f0)
- Texte sombre (#1a4d1a)
- Accent vert naturel (#6ba86b)
- **Idéal pour :** Lecture de jour, environnement lumineux

#### Mode Sombre 🌙
- Fond très sombre (#0d2e0d)
- Texte clair (#e0ffe0)
- Accent vert lumineux (#7ec97e)
- **Idéal pour :** Confort nocturne, économie d'énergie (OLED)

#### Mode Tempéré 🍂
- Fond chaleureux (#faf8f3)
- Texte brun naturel (#3d2817)
- Accent brun-vert (#a67b52)
- **Idéal pour :** Ambiance cozy, lectures longues

### 2. **Taille de Police**
- **Petit** (90%) - Affichage dense
- **Normal** (100%) - Taille par défaut
- **Grand** (110%) - Confortable
- **Très Grand** (120%) - Accessibilité

### 3. **Densité d'Espacement**
- **Compact** (0.75x) - Affichage dense, plus d'infos à l'écran
- **Normal** (1x) - Équilibre par défaut
- **Confortable** (1.25x) - Lisibilité maximale

### 4. **Animations et Transitions**
- Peut être **activées** (défaut) pour une interface fluide
- Peut être **désactivées** pour :
  - Problèmes de mouvement (motion sickness)
  - Performance sur appareils lents
  - Préférences d'accessibilité

### 5. **Langue**
- 🇫🇷 Français (défaut)
- 🇬🇧 English

### 6. **Notifications**
- Activer/Désactiver les emails promotionnels

## 💾 Stockage

Toutes les préférences sont sauvegardées dans **localStorage** :
- `lowa_theme` - Thème actuel
- `lowa_pref_font_size` - Taille de police
- `lowa_pref_spacing` - Densité d'espacement
- `lowa_pref_animations` - État des animations
- `lowa_pref_lang` - Langue de l'interface
- `lowa_pref_notif` - Préférences notifications

## 🌐 Où modifier les préférences ?

### Sur index.html (Accueil)
- **Bouton thème** 🌙 en haut à droite du header
- Change dynamiquement entre : Clair → Sombre → Tempéré → Clair

### Sur profile.html (Profil utilisateur)
- Section complète **🎨 Personnalisation de l'interface**
- Tous les réglages en un seul endroit
- Descriptions détaillées pour chaque option

## 🎯 Cas d'Usage

| Besoin | Configuration |
|--------|----------------|
| Travail de jour | Clair + Normal + Normal |
| Lecture longue | Tempéré + Grand + Confortable |
| Confort nocturne | Sombre + Normal + Normal |
| Accessibilité maxima | Grand + Confortable + Sans animations |
| Performance | Compact + Small + Sans animations |

## ⚙️ Implémentation Technique

### Variables CSS Dynamiques

```css
--theme-bg        /* Fond selon le thème */
--theme-surface   /* Surface des cartes */
--theme-text      /* Texte principal */
--theme-text-muted /* Texte secondaire */
--theme-border    /* Bordures */
--theme-accent    /* Accent couleur */
--font-scale      /* Échelle de police */
--spacing-scale   /* Échelle d'espacement */
```

### Fonction d'Initialisation

```javascript
// Au chargement de la page
function initTheme() {
    const savedTheme = localStorage.getItem('lowa_theme') || 'light';
    const fontSize = localStorage.getItem('lowa_pref_font_size') || 'normal';
    const spacing = localStorage.getItem('lowa_pref_spacing') || 'normal';
    const animations = localStorage.getItem('lowa_pref_animations') !== 'false';
    
    setTheme(savedTheme);
    applyFontSize(fontSize);
    applySpacing(spacing);
    applyAnimations(animations);
}
```

## 🚀 Avantages

✅ **Accessibilité** - Supports utilisateurs avec préférences de mouvement/contraste  
✅ **Performance** - Désactiver les animations sur appareils lents  
✅ **Confort** - Mode sombre pour les yeux sensibles  
✅ **Lisibilité** - Tailles et espacements ajustables  
✅ **Persistance** - Les préférences sont sauvegardées et restaurées  

## 📱 Responsive

Tous les thèmes et réglages sont **100% responsifs** et fonctionnent sur :
- Desktop
- Tablet
- Mobile (téléphones)
- Accessibilité maximale

## 🔄 Synchronisation

Les préférences sont appliquées :
- ✅ Immédiatement au clic (pas de rechargement)
- ✅ Automatiquement au retour sur le site
- ✅ Sur toutes les pages (index.html, profile.html)

## 🎨 Couleurs par Thème

### Clair
| Élément | Couleur |
|---------|---------|
| Fond | `#f0f5f0` |
| Surface | `#ffffff` |
| Texte | `#1a4d1a` |
| Accent | `#6ba86b` |
| Bordure | `#c7e8c7` |

### Sombre
| Élément | Couleur |
|---------|---------|
| Fond | `#0d2e0d` |
| Surface | `#1a4d1a` |
| Texte | `#e0ffe0` |
| Accent | `#7ec97e` |
| Bordure | `#2d5a2d` |

### Tempéré
| Élément | Couleur |
|---------|---------|
| Fond | `#faf8f3` |
| Surface | `#fff9f5` |
| Texte | `#3d2817` |
| Accent | `#a67b52` |
| Bordure | `#e8dfd4` |

---

**Dernière mise à jour :** Décembre 2024  
**Statut :** ✅ Production Ready
