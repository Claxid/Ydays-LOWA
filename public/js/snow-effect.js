// Snow effect animation for LOWA hero section
function initSnow() {
    const c = document.querySelector('#snow-canvas')
    if (!c) {
        console.warn('Snow effect: canvas not found')
        return
    }

    const ctx = c.getContext('2d')
    let cw = window.innerWidth
    let ch = window.innerHeight
    c.width = cw
    c.height = ch

    const SEGMENTS = 100
    let SEG_W = cw / SEGMENTS
    const pileHeights = new Array(SEGMENTS).fill(0)
    let MAX_PILE = Math.max(20, ch * 0.08)
    const LAND_MARGIN = 2
    let smoothCounter = 0
    let lastTime = performance.now()

    const flakes = []
    const NUM_FLAKES = Math.max(100, Math.min(220, Math.floor(cw / 6)))
    const BASE_SPEED = Math.max(30, ch * 0.03)

    function resizeCanvas() {
        cw = window.innerWidth
        ch = window.innerHeight
        c.width = cw
        c.height = ch
        SEG_W = cw / SEGMENTS
        MAX_PILE = Math.max(20, ch * 0.08)
        pileHeights.length = SEGMENTS
        pileHeights.fill(0)
    }

    function getPileHeightAtX(x) {
        const i = Math.max(0, Math.min(SEGMENTS - 1, Math.floor(x / SEG_W)))
        return pileHeights[i]
    }

    function addSnowToPile(x, amount) {
        const i = Math.max(0, Math.min(SEGMENTS - 1, Math.floor(x / SEG_W)))
        const a = amount * 0.1
        for (let k = -2; k <= 2; k++) {
            const idx = i + k
            if (idx >= 0 && idx < SEGMENTS) {
                const falloff = 1 - Math.abs(k) * 0.18
                pileHeights[idx] = Math.min(MAX_PILE, pileHeights[idx] + a * falloff)
            }
        }
    }

    function smoothPile() {
        if (smoothCounter++ % 3 !== 0) return
        for (let i = 1; i < SEGMENTS - 1; i++) {
            pileHeights[i] = (pileHeights[i - 1] + pileHeights[i] * 2 + pileHeights[i + 1]) / 4
        }
    }

    function resetFlake(flake, initial) {
        flake.x = Math.random() * cw
        flake.y = initial ? Math.random() * ch : -10 - Math.random() * ch
        flake.size = Math.random() * 2 + 1.2
        flake.speed = BASE_SPEED * (0.6 + Math.random() * 0.8)
        flake.drift = (Math.random() * 0.5 + 0.2) * (Math.random() < 0.5 ? -1 : 1)
        flake.offset = Math.random() * Math.PI * 2
        flake.vx = flake.drift * 10
        flake.vy = flake.speed
    }

    for (let i = 0; i < NUM_FLAKES; i++) {
        flakes.push({ x: 0, y: 0, vx: 0, vy: 0, size: 0, drift: 0, offset: 0 })
        resetFlake(flakes[i], true)
    }

    let requestId = null
    function render() {
        const now = performance.now()
        const dt = Math.min(1, (now - lastTime) / 1000)
        lastTime = now

        ctx.clearRect(0, 0, cw, ch)

        smoothPile()
        ctx.beginPath()
        ctx.moveTo(0, ch)
        for (let i = 0; i < SEGMENTS; i++) {
            const x = i * SEG_W
            const wave = Math.sin(i / 16) * 8 + Math.sin(i / 40) * 6
            const y = ch - pileHeights[i] + wave
            ctx.lineTo(x, y)
        }
        ctx.lineTo(cw, ch)
        ctx.closePath()
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        for (let i = 0; i < flakes.length; i++) {
            const flake = flakes[i]
            flake.x += flake.vx * dt
            flake.y += flake.vy * dt
            flake.x += Math.sin((flake.y + flake.offset) * 0.02) * 0.3

            if (flake.x < -20) {
                flake.x = cw + 20
            } else if (flake.x > cw + 20) {
                flake.x = -20
            }

            const pileH = getPileHeightAtX(flake.x)
            if (flake.y >= ch - pileH - LAND_MARGIN) {
                addSnowToPile(flake.x, Math.max(0.4, flake.size * 0.35))
                resetFlake(flake, false)
                continue
            }

            const radius = flake.size * (1 - flake.y / ch * 0.4)
            ctx.fillRect(flake.x - radius * 0.5, flake.y - radius * 0.5, radius, radius)
        }

        requestId = window.requestAnimationFrame(render)
    }

    window.addEventListener('resize', resizeCanvas)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (requestId) {
                window.cancelAnimationFrame(requestId)
                requestId = null
            }
        } else if (!requestId) {
            lastTime = performance.now()
            requestId = window.requestAnimationFrame(render)
        }
    })

    requestId = window.requestAnimationFrame(render)
}

document.addEventListener('DOMContentLoaded', initSnow)
