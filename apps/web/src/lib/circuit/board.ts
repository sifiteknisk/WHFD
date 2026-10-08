export const TILE_W = 274
export const TILE_H = 177

export const BOARD_TINT = 'rgb(12, 26, 44)'

export const sprites = {
  dip: { src: '/circuit/dip.png', frameW: 108, frameH: 68, frames: 12, fit: 0.88 },
  dipSm: { src: '/circuit/dip-sm.png', frameW: 64, frameH: 64, frames: 12, fit: 1 },
  chip: { src: '/circuit/chip.png', frameW: 124, frameH: 124, frames: 12, fit: 0.72 },
  capRed: { src: '/circuit/cap-red.png', frameW: 64, frameH: 64, frames: 12, fit: 1 },
  capBlue: { src: '/circuit/cap-blue.png', frameW: 64, frameH: 64, frames: 12, fit: 1 },
  axial: { src: '/circuit/axial.png', frameW: 100, frameH: 60, frames: 12, fit: 1 },
  axialDark: {
    src: '/circuit/axial-dark.png',
    frameW: 100,
    frameH: 60,
    frames: 12,
    fit: 1,
  },
} as const

export type PartKind = keyof typeof sprites

export const partKinds = Object.keys(sprites) as PartKind[]

export type Part = {
  kind: PartKind
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  quarter: number
  frame: number
  frameRate: number
}

export type Scene = {
  parts: Part[]
}

const FALLBACK: [number, number, number] = [63, 111, 163]

function population(width: number, height: number) {
  return Math.min(8, Math.max(4, Math.round((width * height) / 100000)))
}

function makePart(width: number, height: number, kind: PartKind): Part {
  const speed = 42 + Math.random() * 58
  const angle = Math.random() * Math.PI * 2
  return {
    kind,
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    scale: sprites[kind].fit * (1.15 + Math.random() * 0.45),
    quarter: Math.floor(Math.random() * 4),
    frame: Math.random() * sprites[kind].frames,
    frameRate: 5 + Math.random() * 6,
  }
}

export function createScene(width: number, height: number): Scene {
  const count = population(width, height)
  const kinds = [...partKinds]
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = kinds[i]
    kinds[i] = kinds[j]
    kinds[j] = swap
  }
  const parts: Part[] = []
  for (let i = 0; i < count; i++) {
    parts.push(makePart(width, height, kinds[i % kinds.length]))
  }
  return { parts }
}

export function advance(scene: Scene, dt: number, width: number, height: number) {
  const step = dt / 1000
  const margin = -48
  for (const part of scene.parts) {
    part.x += part.vx * step
    part.y += part.vy * step
    part.frame += part.frameRate * step
    if (part.x < margin) {
      part.x = margin
      part.vx = Math.abs(part.vx)
    } else if (part.x > width - margin) {
      part.x = width - margin
      part.vx = -Math.abs(part.vx)
    }
    if (part.y < margin) {
      part.y = margin
      part.vy = Math.abs(part.vy)
    } else if (part.y > height - margin) {
      part.y = height - margin
      part.vy = -Math.abs(part.vy)
    }
  }
}

function parseColor(value: string): [number, number, number] {
  const channels = value.match(/[\d.]+/g)
  if (!channels || channels.length < 3) return FALLBACK
  return [Number(channels[0]), Number(channels[1]), Number(channels[2])]
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, value))
}

function recolor(
  r: number,
  g: number,
  b: number,
  tint: [number, number, number]
): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max < 16) return tint
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (max - min < 18) {
    const amount = Math.min(0.92, 0.28 + luma * 0.75)
    return [
      Math.round(tint[0] + (255 - tint[0]) * amount),
      Math.round(tint[1] + (255 - tint[1]) * amount),
      Math.round(tint[2] + (255 - tint[2]) * amount),
    ]
  }
  const dark = tint.map(channel => Math.round(channel * 0.55))
  const hue = [r, g, b].map(channel => Math.round(channel * (200 / max)))
  return [
    clamp(Math.round(dark[0] + (hue[0] - dark[0]) * 0.4)),
    clamp(Math.round(dark[1] + (hue[1] - dark[1]) * 0.4)),
    clamp(Math.round(dark[2] + (hue[2] - dark[2]) * 0.4)),
  ]
}

export function tintPixels(pixels: Uint8ClampedArray, tint: string) {
  const rgb = parseColor(tint)
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = recolor(pixels[i], pixels[i + 1], pixels[i + 2], rgb)
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = 255
  }
}
