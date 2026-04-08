// Snow effect animation for LOWA hero section
// Vérifier que GSAP est chargé avant d'exécuter
if (typeof gsap === 'undefined') {
    console.warn('Snow effect: GSAP not loaded yet, waiting...')
    document.addEventListener('DOMContentLoaded', initSnow)
} else {
    initSnow()
}

function initSnow() {
    if (typeof gsap === 'undefined') {
        console.error('Snow effect: GSAP library not found')
        return
    }

const arr = [] // particles
const c = document.querySelector('#snow-canvas')
if (!c) {
    console.warn('Snow effect: canvas not found')
} else {
    console.log('✅ Canvas found!', c)
}

const ctx = c.getContext('2d')
// Use actual viewport dimensions
const cw = (c.width = window.innerWidth)
const ch = (c.height = window.innerHeight)
console.log('📐 Canvas dimensions:', cw, 'x', ch)

const c2 = c.cloneNode(true)
const ctx2 = c2.getContext('2d', { willReadFrequently: true })

// Draw LOWA text mask at appropriate size for current viewport
ctx2.fillStyle = '#000'
ctx2.textAlign = 'center'
ctx2.textBaseline = 'middle'
// Taille de texte réduite (20% de la largeur, max 300px)
const fontSize = Math.min(cw * 0.2, 300)
ctx2.font = `bold ${fontSize}px "Arial Black", "Segoe UI", sans-serif`
ctx2.translate(cw / 2, ch / 2)
ctx2.fillText('LOWA', 0, fontSize * 0.15)

// --- Snow pile model (bottom accumulation) ---
const SEGMENTS = 150 // Réduit pour perf
const SEG_W = cw / SEGMENTS
const pileHeights = new Array(SEGMENTS).fill(0)
const MAX_PILE = Math.max(20, ch * 0.08)
const LAND_MARGIN = 2
let smoothCounter = 0 // Smooth toutes les 2 frames seulement

function getPileHeightAtX(x) {
    const i = Math.max(0, Math.min(SEGMENTS - 1, Math.floor(x / SEG_W)))
    return pileHeights[i]
}

function addSnowToPile(x, amount) {
    const i = Math.max(0, Math.min(SEGMENTS - 1, Math.floor(x / SEG_W)))
    // distribute to neighbors for a natural shape
    const a = amount * 0.08 // ralentir l'accumulation
    for (let k = -2; k <= 2; k++) {
        const idx = i + k
        if (idx >= 0 && idx < SEGMENTS) {
            const falloff = 1 - Math.abs(k) * 0.15 // less spread to keep pile thin
            pileHeights[idx] = Math.min(MAX_PILE, pileHeights[idx] + a * falloff)
        }
    }
}

function smoothPile() {
    // Smooth seulement toutes les 2 frames pour réduire les calculs
    if (smoothCounter++ % 2 !== 0) return
    for (let i = 1; i < SEGMENTS - 1; i++) {
        pileHeights[i] = (pileHeights[i - 1] + pileHeights[i] * 2 + pileHeights[i + 1]) / 4
    }
}

for (let i = 0; i < 1200; i++) makeFlake(i, true)

function makeFlake(i, ff) {
    const size = gsap.utils.random(1.5, 4, 0.2)
    const xOffset = cw * 0.15
    arr.push({ i: i, x: 0, x2: 0, y: 0, s: size })

    // Uniform storm from all edges (top, left, right, bottom)
    const perimeter = 2 * (cw + ch)
    const r = Math.random() * perimeter
    let from, to

    if (r < cw) {
        // Top edge: uniform across full width
        from = { x: r, y: -15, s: size, x2: 0 }
        to = { ease: 'none', x: () => r + gsap.utils.random(-xOffset * 0.5, xOffset * 0.5), y: ch + 15, duration: gsap.utils.random(8, 14), x2: gsap.utils.random(-xOffset, xOffset) }
    } else if (r < cw + ch) {
        // Right edge: full height
        const relY = r - cw
        from = { x: cw + 15, y: relY, s: size, x2: 0 }
        to = { ease: 'none', x: -15, y: () => relY + gsap.utils.random(-xOffset * 0.3, xOffset * 0.3), duration: gsap.utils.random(8, 14), x2: gsap.utils.random(-xOffset, xOffset) }
    } else if (r < 2 * cw + ch) {
        // Bottom edge: full width
        const relX = r - cw - ch
        from = { x: cw - relX, y: ch + 15, s: size, x2: 0 }
        to = { ease: 'none', x: () => (cw - relX) + gsap.utils.random(-xOffset * 0.5, xOffset * 0.5), y: -15, duration: gsap.utils.random(8, 14), x2: gsap.utils.random(-xOffset, xOffset) }
    } else {
        // Left edge: full height
        const relY = r - 2 * cw - ch
        from = { x: -15, y: relY, s: size, x2: 0 }
        to = { ease: 'none', x: cw + 15, y: () => relY + gsap.utils.random(-xOffset * 0.3, xOffset * 0.3), duration: gsap.utils.random(8, 14), x2: gsap.utils.random(-xOffset, xOffset) }
    }

    arr[i].t = gsap
        .timeline({ repeat: -1, repeatRefresh: true })
        .fromTo(arr[i], from, to)
        .seek(ff ? Math.random() * 99 : 0)
}

gsap.ticker.add(render)

function render() {
    ctx.clearRect(0, 0, cw, ch)
    // Draw pile first (background)
    smoothPile()
    ctx.beginPath()
    ctx.moveTo(0, ch)
    for (let i = 0; i < SEGMENTS; i++) {
        const x = i * SEG_W
        // Ondulations très prononcées au sommet (vallonné dramatique)
        const wave = Math.sin(i / 18) * 12 + Math.sin(i / 40) * 8
        const y = ch - pileHeights[i] + wave
        ctx.lineTo(x, y)
    }
    ctx.lineTo(cw, ch)
    ctx.closePath()
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Draw flakes and handle landing
    arr.forEach(c => {
        if (c.t) {
            if (c.t.isActive()) {
                const d = ctx2.getImageData(c.x + c.x2, c.y, 1, 1)
                // Collision : abaisser le seuil à 100 pour plus de sensibilité
                if (d.data[3] > 100) {
                    c.t.pause()
                    if (arr.length < 8000) makeFlake(arr.length - 1, false)
                }
            }
        }
        // Dessiner un flocon en forme d'étoile "*"
        const x = c.x + c.x2
        const y = c.y
        const s = c.s * gsap.utils.interpolate(1, 0.2, c.y / ch)
        // Landing detection and accumulation
        const pileH = getPileHeightAtX(x)
        if (y >= ch - pileH - LAND_MARGIN) {
            addSnowToPile(x, Math.max(0.5, s * 0.45))
            // Respawn flake from top by restarting its timeline
            c.t.progress(0)
            c.t.play()
            return
        }
        
        ctx.save()
        ctx.translate(x, y)
        ctx.beginPath()
        // Forme d'étoile: 4 lignes qui se croisent
        ctx.moveTo(-s, 0)
        ctx.lineTo(s, 0)
        ctx.moveTo(0, -s)
        ctx.lineTo(0, s)
        ctx.moveTo(-s * 0.7, -s * 0.7)
        ctx.lineTo(s * 0.7, s * 0.7)
        ctx.moveTo(s * 0.7, -s * 0.7)
        ctx.lineTo(-s * 0.7, s * 0.7)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
    })
}

} // Fin de la fonction initSnow()
