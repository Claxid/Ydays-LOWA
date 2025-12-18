// Snow effect animation for LOWA hero section
const arr = [] // particles
const c = document.querySelector('#snow-canvas')
if (!c) {
    console.warn('❄️ snow: canvas not found')
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

for (let i = 0; i < 800; i++) makeFlake(i, true)

function makeFlake(i, ff) {
    const size = gsap.utils.random(1.5, 4, 0.2) // Flocons encore plus petits (1.5-4px)
    const xOffset = cw * 0.12 // Drift réduit
    arr.push({ i: i, x: 0, x2: 0, y: 0, s: size })
    arr[i].t = gsap
        .timeline({ repeat: -1, repeatRefresh: true })
        .fromTo(
            arr[i],
            {
                x: () => -xOffset + (cw + xOffset * 2) * Math.random(),
                y: -15,
                s: size,
                x2: -xOffset,
            },
            {
                ease: 'none',
                y: ch + 15,
                duration: gsap.utils.random(6, 12), // Un peu plus rapide (6-12 sec au lieu de 8-15)
                x: '+=' + `random(-${xOffset}, ${xOffset}, 1)`,
                x2: xOffset,
            }
        )
        .seek(ff ? Math.random() * 99 : 0)
}

gsap.ticker.add(render)

function render() {
    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = '#ffffff'
    arr.forEach(c => {
        if (c.t) {
            if (c.t.isActive()) {
                const d = ctx2.getImageData(c.x + c.x2, c.y, 1, 1)
                if (d.data[3] > 150 && Math.random() > 0.5) {
                    c.t.pause()
                    if (arr.length < 9000) makeFlake(arr.length - 1, false)
                }
            }
        }
        // Dessiner un flocon en forme d'étoile "*"
        const x = c.x + c.x2
        const y = c.y
        const s = c.s * gsap.utils.interpolate(1, 0.2, c.y / ch)
        
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
