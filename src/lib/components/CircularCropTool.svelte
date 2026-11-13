<!-- src/lib/components/CircularCropTool.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  export let imageUrl: string = ''

  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D | null

  let image = new Image()
  let isDragging = false

  // Crop parameters
  let scale = 1
  let fitScale = 1 // scale at which the image exactly covers the circle
  let offsetX = 0
  let offsetY = 0

  let startX = 0
  let startY = 0

  let initialPinchDistance = 0
  let initialPinchScale = 1

  const dispatch = createEventDispatcher<{ crop: { finalCanvas: HTMLCanvasElement } }>()

  $: if (imageUrl) {
    image.src = imageUrl
    image.onload = () => {
      // Auto-fit initially
      const size = Math.min(image.width, image.height)
      fitScale = 368 / size
      scale = fitScale
      offsetX = (368 - image.width * scale) / 2
      offsetY = (368 - image.height * scale) / 2
      draw()
    }
  }

  onMount(() => {
    ctx = canvas.getContext('2d')
    draw()
  })

  function draw() {
    if (!ctx || !image.complete || !image.src) return

    // Clear
    ctx.clearRect(0, 0, 368, 368)

    // Draw image
    ctx.drawImage(image, offsetX, offsetY, image.width * scale, image.height * scale)

    // Draw circular mask
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.beginPath()
    ctx.rect(0, 0, 368, 368)
    ctx.arc(184, 184, 184, 0, Math.PI * 2, true)
    ctx.fill()

    // Draw border
    ctx.strokeStyle = '#00f2ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(184, 184, 184, 0, Math.PI * 2)
    ctx.stroke()
  }

  let activePointers: Map<number, PointerEvent> = new Map()

  function getDistance(p1: PointerEvent, p2: PointerEvent) {
    return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY)
  }

  function handlePointerDown(e: PointerEvent) {
    activePointers.set(e.pointerId, e)

    if (activePointers.size === 1) {
      isDragging = true
      startX = e.clientX - offsetX
      startY = e.clientY - offsetY
    } else if (activePointers.size === 2) {
      isDragging = false // stop drag to pinch
      const [p1, p2] = Array.from(activePointers.values())
      initialPinchDistance = getDistance(p1, p2)
      initialPinchScale = scale
    }

    canvas.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent) {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, e)
    }

    if (activePointers.size === 1 && isDragging) {
      offsetX = e.clientX - startX
      offsetY = e.clientY - startY
      draw()
    } else if (activePointers.size === 2) {
      const [p1, p2] = Array.from(activePointers.values())
      const currentDistance = getDistance(p1, p2)
      if (initialPinchDistance > 0) {
        const zoom = currentDistance / initialPinchDistance
        const newScale = initialPinchScale * zoom

        // Adjust offset to zoom around center (simplified)
        const center = 184
        offsetX = center - (center - offsetX) * (newScale / scale)
        offsetY = center - (center - offsetY) * (newScale / scale)
        scale = newScale
        draw()
      }
    }
  }

  function handlePointerUp(e: PointerEvent) {
    activePointers.delete(e.pointerId)
    if (activePointers.size < 2) {
      initialPinchDistance = 0
    }
    if (activePointers.size === 1) {
      // Re-init drag for remaining finger
      const [p1] = Array.from(activePointers.values())
      isDragging = true
      startX = p1.clientX - offsetX
      startY = p1.clientY - offsetY
    } else if (activePointers.size === 0) {
      isDragging = false
    }
    canvas.releasePointerCapture(e.pointerId)
  }

  function updateScale(e: Event) {
    const input = e.target as HTMLInputElement
    const newScale = parseFloat(input.value)
    const center = 184
    offsetX = center - (center - offsetX) * (newScale / scale)
    offsetY = center - (center - offsetY) * (newScale / scale)
    scale = newScale
    draw()
  }


  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    const zoomIntensity = 0.1
    const zoom = Math.exp(-e.deltaY * zoomIntensity * 0.01)

    // Zoom around mouse center ideally, but for simplicity zooming around center
    scale *= zoom

    // Adjust offset to keep center (simplified)
    const center = 184
    offsetX = center - (center - offsetX) * zoom
    offsetY = center - (center - offsetY) * zoom

    draw()
  }

  function confirmCrop() {
    // Generate final 368x368 canvas without the dark mask, but with circular clipping
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = 368
    finalCanvas.height = 368
    const fCtx = finalCanvas.getContext('2d')!

    fCtx.beginPath()
    fCtx.arc(184, 184, 184, 0, Math.PI * 2)
    fCtx.clip()

    fCtx.drawImage(image, offsetX, offsetY, image.width * scale, image.height * scale)

    dispatch('crop', { finalCanvas })
  }
</script>

<div class="crop-container">
  <canvas
    bind:this={canvas}
    width="368"
    height="368"
    aria-label="Aperçu du recadrage : faites glisser pour déplacer l'image"
    on:pointerdown={handlePointerDown}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
    on:pointercancel={handlePointerUp}
    on:wheel|preventDefault={handleWheel}
  ></canvas>
  <p class="muted hint">Glissez pour déplacer, pincez ou utilisez la molette pour zoomer.</p>
  <div class="controls">
    <label for="zoom">Zoom</label>
    <input id="zoom" type="range" min={fitScale * 0.5} max={fitScale * 5} step={fitScale * 0.05} value={scale} on:input={updateScale} />
  </div>
  <button class="btn btn-primary" on:click={confirmCrop}>Ajouter à la file d'attente</button>
</div>

<style>
  .crop-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-top: 16px;
  }

  canvas {
    max-width: 100%;
    height: auto;
    border-radius: 16px;
    background: #000;
    touch-action: none;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }

  .hint {
    font-size: 0.82rem;
    text-align: center;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    font-size: 0.9rem;
  }

  .controls input[type="range"] {
    flex: 1;
    accent-color: var(--accent);
  }

  .btn {
    width: 100%;
  }
</style>
