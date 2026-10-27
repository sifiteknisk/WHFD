import type { Attachment } from 'svelte/attachments'

// CSS px per fire cell; the canvas is upscaled with `image-rendering: pixelated`.
const CELL = 3
const FRAME_MS = 1000 / 30

// PSX Doom fire palette: ember black → red → orange → yellow → white.
const PALETTE = [
  '070707',
  '1f0707',
  '2f0f07',
  '470f07',
  '571707',
  '671f07',
  '771f07',
  '8f2707',
  '9f2f07',
  'af3f07',
  'bf4707',
  'c74707',
  'df4f07',
  'df5707',
  'df5707',
  'd75f07',
  'd75f07',
  'd7670f',
  'cf6f0f',
  'cf770f',
  'cf7f0f',
  'cf8717',
  'c78717',
  'c78f17',
  'c7971f',
  'bf9f1f',
  'bf9f1f',
  'bfa727',
  'bfa727',
  'bfaf2f',
  'b7af2f',
  'b7b72f',
  'b7b737',
  'cfcf6f',
  'dfdf9f',
  'efefc7',
  'ffffff',
].map(hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)))

const MAX = PALETTE.length - 1
// Source heat stays below white-hot so text over the base stays legible.
const SOURCE = MAX - 10
// Lowest intensities fade out so the cooling tips blend into the box.
const FADE = 8
// Heat below this drifts out as smoke rather than flame.
const SMOKE = [70, 64, 60]

// Classic Doom fire filling the host. Pair with `data-on-fire` on the host for
// the surrounding styles in `styles/fire.css`; set `--fire-overflow` there to
// let flames lick out above the box.
export const fire: Attachment<HTMLElement> = node => {
  const canvas = document.createElement('canvas')
  canvas.dataset.fire = ''
  canvas.ariaHidden = 'true'
  node.prepend(canvas)

  const ctx = canvas.getContext('2d')!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let width = 0
  let height = 0
  let heat = new Float32Array(0)
  let image: ImageData | undefined
  let decay = 1
  let visible = true
  let frame = 0
  let last = 0

  function resize() {
    // Wait for real layout so the first fire isn't stretched from a stub.
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return
    const w = Math.ceil(canvas.clientWidth / CELL)
    const h = Math.max(2, Math.ceil(canvas.clientHeight / CELL))
    if (w === width && h === height) return
    const next = new Float32Array(w * h)
    // Resizes stretch the existing flames instead of reigniting.
    for (let y = 0; y < h; y++) {
      const row = Math.floor((y * height) / h) * width
      for (let x = 0; x < w; x++) {
        next[y * w + x] = heat[row + Math.floor((x * width) / w)] ?? 0
      }
    }
    const fresh = width === 0
    width = canvas.width = w
    height = canvas.height = h
    heat = next
    // Tune cooling so the average flame licks just past the top edge.
    decay = SOURCE / (h * 0.9)
    image = ctx.createImageData(w, h)
    if (fresh) ignite()
    paint()
  }

  // Run the spread bottom-up in one sweep so every column gets a full random
  // walk from the source, giving a natural blaze on the very first frame.
  function ignite() {
    feed()
    for (let y = height - 1; y >= 1; y--) {
      for (let x = 0; x < width; x++) {
        const src = y * width + x
        heat[src - width] = cool(heat[src]!)
      }
      for (let x = 0; x < width; x++) spread(y * width + x)
    }
  }

  function feed() {
    const bottom = (height - 1) * width
    for (let x = 0; x < width; x++) {
      heat[bottom + x] = SOURCE - Math.random() * 4
    }
  }

  function cool(value: number) {
    return Math.max(0, value - Math.random() * 2 * decay)
  }

  function spread(src: number) {
    const dst = src - width - Math.floor(Math.random() * 4) + 1
    if (dst >= 0) heat[dst] = cool(heat[src]!)
  }

  function step() {
    feed()
    for (let src = width; src < heat.length; src++) spread(src)
  }

  function paint() {
    if (!image) return
    const data = image.data
    for (let i = 0; i < heat.length; i++) {
      const value = heat[i]!
      const color = PALETTE[Math.round(value)]!
      // Cooling tips blend from flame into translucent smoke.
      const t = Math.min(1, value / FADE)
      const o = i * 4
      for (let c = 0; c < 3; c++) {
        data[o + c] = SMOKE[c]! + (color[c]! - SMOKE[c]!) * t
      }
      data[o + 3] = Math.sqrt(t) * 255
    }
    ctx.putImageData(image, 0, 0)
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick)
    if (!visible || now - last < FRAME_MS) return
    last = now
    step()
    paint()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  resize()

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
  })
  intersectionObserver.observe(node)

  if (!reduced) frame = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    canvas.remove()
  }
}
