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
  let offsetX = 0
  let offsetY = 0

  let startX = 0
  let startY = 0

  const dispatch = createEventDispatcher()

  $: if (imageUrl) {
    image.src = imageUrl
    image.onload = () => {
      // Auto-fit initially
      const size = Math.min(image.width, image.height)
      scale = 368 / size
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

  function handlePointerDown(e: PointerEvent) {
    isDragging = true
    startX = e.clientX - offsetX
    startY = e.clientY - offsetY
    canvas.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return
    offsetX = e.clientX - startX
    offsetY = e.clientY - startY
    draw()
  }

  function handlePointerUp(e: PointerEvent) {
    isDragging = false
    canvas.releasePointerCapture(e.pointerId)
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

    // In a real app we'd convert this to JPEG bytes, but here we just pass the canvas/url
    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.88)
    dispatch('crop', { dataUrl, finalCanvas })
  }
</script>

<div class="crop-container">
  <canvas
    bind:this={canvas}
    width="368"
    height="368"
    on:pointerdown={handlePointerDown}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
    on:wheel|preventDefault={handleWheel}
  ></canvas>
  <div class="actions">
    <button on:click={confirmCrop}>Confirmer le recadrage</button>
  </div>
</div>

<style>
  .crop-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    background: #0a0b1e;
    padding: 1rem;
    border-radius: 12px;
  }

  canvas {
    border: 1px solid #1e4d51;
    border-radius: 12px;
    touch-action: none;
    cursor: move;
  }

  button {
    background: #00f2ff;
    color: #0a0b1e;
    border: none;
    padding: 8px 16px;
    border-radius: 16px;
    font-weight: bold;
    cursor: pointer;
  }
</style>