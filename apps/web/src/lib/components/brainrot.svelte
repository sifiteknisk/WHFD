<script lang="ts">
  import {
    activate,
    ACTIVATED_MAX_Z,
    advanceBuffer,
    bringToFront as bringToFrontOf,
    closeWindow as closeWindowOf,
    dragTo,
    INITIAL_MAX_Z,
    type Drag,
    type VideoWindow,
  } from '$lib/components/brainrot-logic'
  import WindowBox from '$lib/components/window-box.svelte'

  let buffer = $state('')
  let windows = $state<VideoWindow[]>([])
  let maxZ = $state(INITIAL_MAX_Z)
  let dragging = $state<Drag | null>(null)

  function onKeydown(event: KeyboardEvent) {
    const targetIsTextField =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    const result = advanceBuffer(buffer, event.key, targetIsTextField)
    buffer = result.buffer
    if (result.activated) {
      const spawned = activate(windows)
      if (spawned !== windows) {
        windows = spawned
        maxZ = ACTIVATED_MAX_Z
      }
    }
  }

  function bringToFront(id: number) {
    const result = bringToFrontOf(windows, id, maxZ)
    windows = result.windows
    maxZ = result.maxZ
  }

  function startDrag(event: MouseEvent, id: number) {
    const win = windows.find(w => w.id === id)
    if (!win) return
    bringToFront(id)
    dragging = {
      id,
      offsetX: event.clientX - win.x,
      offsetY: event.clientY - win.y,
    }
  }

  function onMouseMove(event: MouseEvent) {
    windows = dragTo(windows, dragging, event.clientX, event.clientY)
  }

  function onMouseUp() {
    dragging = null
  }
</script>

<svelte:window
  onkeydown={onKeydown}
  onmousemove={dragging ? onMouseMove : undefined}
  onmouseup={dragging ? onMouseUp : undefined}
/>

{#each windows as win (win.id)}
  <WindowBox
    floating
    title={win.title}
    style="left: {win.x}px; top: {win.y}px; width: {win.w}px; height: {win.h}px; z-index: {win.z}"
    onmousedown={() => bringToFront(win.id)}
    ontitledown={event => startDrag(event, win.id)}
    onclose={() => (windows = closeWindowOf(windows, win.id))}
  >
    <iframe
      src="{win.url}?autoplay=1&mute=1&loop=1"
      title={win.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
  </WindowBox>
{/each}

<style>
  iframe {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 0;
    border: none;
  }
</style>
