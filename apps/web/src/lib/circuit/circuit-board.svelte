<script lang="ts">
  import type { Attachment } from 'svelte/attachments'
  import {
    BOARD_TINT,
    TILE_H,
    TILE_W,
    advance,
    createScene,
    partKinds,
    sprites as spriteSpec,
    tintPixels,
    type PartKind,
    type Scene,
  } from './board'

  function fit(canvas: HTMLCanvasElement) {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2)
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const bitmapWidth = Math.max(1, Math.round(width * dpr))
    const bitmapHeight = Math.max(1, Math.round(height * dpr))
    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth
      canvas.height = bitmapHeight
    }
    const ctx = canvas.getContext('2d')
    if (!ctx || width === 0 || height === 0) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { ctx, width, height }
  }

  function tintedBoard(image: HTMLImageElement, tint: string) {
    const pattern = document.createElement('canvas')
    pattern.width = image.naturalWidth
    pattern.height = image.naturalHeight
    const ctx = pattern.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, pattern.width, pattern.height)
    tintPixels(pixels.data, tint)
    ctx.putImageData(pixels, 0, 0)
    return pattern
  }

  function paint(
    ctx: CanvasRenderingContext2D,
    pattern: HTMLCanvasElement | undefined,
    scene: Scene,
    sprites: Partial<Record<PartKind, HTMLImageElement>>,
    tint: string,
    width: number,
    height: number
  ) {
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, width, height)
    if (pattern) {
      for (let y = 0; y < height; y += TILE_H) {
        for (let x = 0; x < width; x += TILE_W) {
          ctx.drawImage(pattern, x, y, TILE_W, TILE_H)
        }
      }
    }
    for (const part of scene.parts) {
      const image = sprites[part.kind]
      const spec = spriteSpec[part.kind]
      if (!image) continue
      const frame = Math.floor(part.frame) % spec.frames
      const drawWidth = spec.frameW * part.scale
      const drawHeight = spec.frameH * part.scale
      ctx.save()
      ctx.translate(part.x, part.y)
      ctx.rotate((part.quarter * Math.PI) / 2)
      ctx.shadowColor = 'rgb(8 24 48 / 0.35)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 5
      ctx.drawImage(
        image,
        frame * spec.frameW,
        0,
        spec.frameW,
        spec.frameH,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      )
      ctx.restore()
    }
  }

  const run: Attachment<HTMLCanvasElement> = canvas => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let scene: Scene | undefined
    let pattern: HTMLCanvasElement | undefined
    const sprites: Partial<Record<PartKind, HTMLImageElement>> = {}
    let board: HTMLImageElement | undefined
    let frame = 0
    let last = 0
    let running = true

    function ensure(width: number, height: number) {
      if (board && board.naturalWidth > 0 && !pattern) {
        pattern = tintedBoard(board, BOARD_TINT)
      }
      if (!scene) scene = createScene(width, height)
    }

    function draw(now: number) {
      const fitted = fit(canvas)
      if (!fitted) return
      ensure(fitted.width, fitted.height)
      if (!scene) return
      if (!reduced) {
        const dt = last === 0 ? 16 : Math.min(48, now - last)
        last = now
        advance(scene, dt, fitted.width, fitted.height)
      }
      paint(
        fitted.ctx,
        pattern,
        scene,
        sprites,
        BOARD_TINT,
        fitted.width,
        fitted.height
      )
    }

    const boardImage = new Image()
    boardImage.onload = () => {
      board = boardImage
    }
    boardImage.src = '/circuit/board.png'

    for (const kind of partKinds) {
      const image = new Image()
      image.onload = () => {
        sprites[kind] = image
      }
      image.src = spriteSpec[kind].src
    }

    const observer = new ResizeObserver(() => {
      scene = undefined
      last = 0
      draw(performance.now())
    })
    observer.observe(canvas)

    function loop(now: number) {
      if (!running) return
      draw(now)
      frame = requestAnimationFrame(loop)
    }

    function onVisibility() {
      cancelAnimationFrame(frame)
      last = 0
      if (!document.hidden && !reduced && running)
        frame = requestAnimationFrame(loop)
    }

    if (reduced) draw(0)
    else frame = requestAnimationFrame(loop)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }
</script>

<circuit-board aria-hidden="true">
  <canvas {@attach run}></canvas>
</circuit-board>

<style>
  circuit-board {
    position: fixed;
    display: block;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;

    &::before,
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
    }

    &::before {
      background:
        linear-gradient(
          to bottom,
          rgb(6 14 28 / 0.82),
          rgb(6 14 28 / 0.4) var(--header-height),
          transparent calc(var(--header-height) + 3.5rem)
        ),
        linear-gradient(
          to top,
          rgb(6 14 28 / 0.82),
          rgb(6 14 28 / 0.45) var(--shell-hint-height),
          transparent calc(var(--shell-hint-height) + 3rem)
        );
    }

    &::after {
      background: repeating-linear-gradient(
        to bottom,
        transparent 0 2px,
        rgb(8 28 52 / 0.14) 2px 3px
      );
      box-shadow: inset 0 0 8rem 2rem rgb(6 14 28 / 0.28);
    }
  }

  canvas {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
  }

  @media (forced-colors: active) {
    circuit-board {
      display: none;
    }
  }
</style>
