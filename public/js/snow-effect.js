// Snow effect animation for LOWA hero section
const arr = [] // particles
const c = document.querySelector('#snow-canvas')
if (!c) {
    console.warn('❄️ snow: canvas not found')
    return;
}

const ctx = c.getContext('2d')
// Use actual viewport dimensions
const cw = (c.width = window.innerWidth)
const ch = (c.height = window.innerHeight)
const c2 = c.cloneNode(true)
const ctx2 = c2.getContext('2d', { willReadFrequently: true })

// Draw LOWA text mask at appropriate size for current viewport
ctx2.fillStyle = '#000'
ctx2.textAlign = 'center'
ctx2.textBaseline = 'middle'
// Scale font size based on viewport width (roughly 40% of width)
const fontSize = Math.min(cw * 0.4, 600)
ctx2.font = `bold ${fontSize}px "Arial Black", "Segoe UI", sans-serif`
ctx2.translate(cw / 2, ch / 2)
ctx2.fillText('LOWA', 0, fontSize * 0.15)

for (let i = 0; i < 2000; i++) makeFlake(i, true)

function makeFlake(i, ff) {
    const size = gsap.utils.random(3, 8, 0.2)
    const xOffset = cw * 0.15 // 15% of width for drift
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
                x: '+=' + `random(-${xOffset}, ${xOffset}, 1)`,
                x2: xOffset,
            }
        )
        .seek(ff ? Math.random() * 99 : 0)
        .timeScale(gsap.utils.random(0.8, 1.8))
}

ctx.fillStyle = '#ffffff'
let firstRenderLogged = false
console.log('❄️ Snow effect initialized: ', { flakes: arr.length })
gsap.ticker.add(render)

function render() {
    if (!firstRenderLogged) {
        console.log('❄️ Snow render ticking')
        firstRenderLogged = true
        // Debug dot in center to confirm canvas is visible
        ctx.beginPath()
        ctx.arc(cw / 2, ch / 2, 12, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.clearRect(0, 0, cw, ch)
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
        ctx.beginPath()
        ctx.arc(
            c.x + c.x2,
            c.y,
            c.s * gsap.utils.interpolate(1, 0.2, c.y / ch),
            0,
            Math.PI * 2
        )
        ctx.fill()
    })
}
