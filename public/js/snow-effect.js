// Snow effect animation for LOWA hero section
const arr = [] // particles
const c = document.querySelector('#snow-canvas')
if (!c) {
    console.warn('❄️ snow: canvas not found')
    return;
}

const ctx = c.getContext('2d')
const cw = (c.width = 3000)
const ch = (c.height = 3000)
const c2 = c.cloneNode(true)
const ctx2 = c2.getContext('2d', { willReadFrequently: true })

// Draw LOWA text mask directly on offscreen canvas to avoid missing image issues
ctx2.fillStyle = '#000'
ctx2.textAlign = 'center'
ctx2.textBaseline = 'middle'
ctx2.font = 'bold 1400px "Arial Black", "Segoe UI", sans-serif'
ctx2.translate(cw / 2, ch / 2)
ctx2.fillText('LOWA', 0, 200)

for (let i = 0; i < 1300; i++) makeFlake(i, true)

function makeFlake(i, ff) {
    const size = gsap.utils.random(3, 8, 0.2)
    arr.push({ i: i, x: 0, x2: 0, y: 0, s: size })
    arr[i].t = gsap
        .timeline({ repeat: -1, repeatRefresh: true })
        .fromTo(
            arr[i],
            {
                x: () => -400 + (cw + 800) * Math.random(),
                y: -15,
                s: size,
                x2: -500,
            },
            {
                ease: 'none',
                y: ch,
                x: '+=' + 'random(-400, 400, 1)',
                x2: 500,
            }
        )
        .seek(ff ? Math.random() * 99 : 0)
        .timeScale(gsap.utils.random(0.8, 1.4))
}

ctx.fillStyle = '#f4f9ff'
let firstRenderLogged = false
console.log('❄️ Snow effect initialized: ', { flakes: arr.length })
gsap.ticker.add(render)

function render() {
    if (!firstRenderLogged) {
        console.log('❄️ Snow render ticking')
        firstRenderLogged = true
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
