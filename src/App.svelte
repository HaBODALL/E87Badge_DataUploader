<!-- src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import TopAppBar from './lib/components/TopAppBar.svelte'
  import CircularCropTool from './lib/components/CircularCropTool.svelte'
  import TransferQueue from './lib/components/TransferQueue.svelte'
  import StorageInfo from './lib/components/StorageInfo.svelte'
  import { E87Client } from './lib/protocol/e87-protocol'
  import { transferQueue } from './lib/store/queue'

  let client: E87Client | null = null
  let isConnected = false

  let selectedImageUrl: string = ''
  let isDraggingOver = false

  let checkInterval: number;

  onMount(() => {
    client = new E87Client()
    transferQueue.setClient(client)

    checkInterval = window.setInterval(() => {
      if (client) {
        isConnected = client['connected'];
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  })

  async function connect() {
    if (!client) return
    try {
      await client.connect()
      isConnected = true
      client = client // trigger reactivity
    } catch (e) {
      console.error("Connection failed", e)
    }
  }

  function disconnect() {
    if (client) {
      client.disconnect()
      isConnected = false
      client = client
    }
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files[0]) {
      handleFile(input.files[0])
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    isDraggingOver = true
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault()
    isDraggingOver = false
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    isDraggingOver = false
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFile(event.dataTransfer.files[0])
    }
  }

  function handleFile(file: File) {
    if (file.type.startsWith('image/')) {
      selectedImageUrl = URL.createObjectURL(file)
    } else {
      alert("Veuillez déposer une image.")
    }
  }

  function handleCrop(event: CustomEvent<{dataUrl: string, finalCanvas: HTMLCanvasElement}>) {
    // In a real app we need to convert the base64/canvas to a Uint8Array of JPEG bytes
    // For MVP, we will simulate the binary extraction

    event.detail.finalCanvas.toBlob(blob => {
      if (!blob) return
      const reader = new FileReader()
      reader.onload = function() {
        const arrayBuffer = this.result as ArrayBuffer
        const bytes = new Uint8Array(arrayBuffer)

        // Add to queue
        const filename = `img_${Date.now()}.jpg`
        transferQueue.add(bytes, filename)

        // Clear selection
        selectedImageUrl = ''
      }
      reader.readAsArrayBuffer(blob)
    }, 'image/jpeg', 0.88)
  }
</script>

<main>
  <TopAppBar {client} />

  <div class="content">
    <div class="connection-card">
      {#if !isConnected}
        <h2>Connectez votre badge AuraCast</h2>
        <p>Utilisez Web Bluetooth pour vous connecter.</p>
        <button class="primary-btn" on:click={connect}>Connecter</button>
      {:else}
        <button class="secondary-btn" on:click={disconnect}>Déconnecter</button>
      {/if}
    </div>

    <div class="main-grid">
      <div class="left-col">
        <div class="upload-card">
          <h3>Envoyer une image</h3>
          {#if !selectedImageUrl}
            <div class="file-drop {isDraggingOver ? 'drag-over' : ''}"
              role="region"
              aria-label="Zone de dépôt de fichier"
              on:dragenter={handleDragOver}
              on:dragover={handleDragOver}
              on:dragleave={handleDragLeave}
              on:drop={handleDrop}>
              <input type="file" accept="image/*" aria-label="Sélectionner une image" on:change={handleFileSelect} />
              <p>Glissez-déposez ou cliquez pour sélectionner une image</p>
            </div>
          {:else}
            <CircularCropTool imageUrl={selectedImageUrl} on:crop={handleCrop} />
            <button class="text-btn" on:click={() => selectedImageUrl = ''}>Annuler</button>
          {/if}
        </div>
      </div>

      <div class="right-col">
        <TransferQueue />
        <StorageInfo {client} />
      </div>
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    background-color: #0a0b1e;
    color: #e4e1e9;
  }

  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .content {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .connection-card {
    background: #131318;
    padding: 24px;
    border-radius: 28px;
    text-align: center;
    margin-bottom: 24px;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (min-width: 768px) {
    .main-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .upload-card {
    background: #131318;
    padding: 24px;
    border-radius: 28px;
  }

  .file-drop {
    border: 2px dashed #1e4d51;
    border-radius: 12px;
    padding: 32px;
    text-align: center;
    position: relative;
    margin-top: 16px;
    transition: all 0.2s ease-in-out;
  }

  .file-drop:hover, .file-drop:focus-within {
    border-color: #00f2ff;
    background: rgba(0, 242, 255, 0.05);
  }

  .file-drop.drag-over {
    border-color: #00f2ff;
    background: rgba(0, 242, 255, 0.1);
    transform: scale(1.02);
  }

  .file-drop input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  button {
    cursor: pointer;
    font-weight: 600;
  }

  .primary-btn {
    background: #00f2ff;
    color: #0a0b1e;
    border: none;
    padding: 12px 24px;
    border-radius: 16px;
    font-size: 1rem;
    transition: all 0.2s ease-in-out;
  }

  .primary-btn:hover {
    background: #4dffff;
    transform: translateY(-1px);
  }

  .primary-btn:focus-visible {
    outline: 2px solid #00f2ff;
    outline-offset: 2px;
  }

  .secondary-btn {
    background: #1e4d51;
    color: #00f2ff;
    border: none;
    padding: 12px 24px;
    border-radius: 16px;
    font-size: 1rem;
    transition: all 0.2s ease-in-out;
  }

  .secondary-btn:hover {
    background: #256166;
    transform: translateY(-1px);
  }

  .secondary-btn:focus-visible {
    outline: 2px solid #00f2ff;
    outline-offset: 2px;
  }

  .text-btn {
    background: transparent;
    color: #908f9f;
    border: none;
    padding: 8px;
    margin-top: 8px;
    width: 100%;
    transition: color 0.2s ease-in-out;
  }

  .text-btn:hover, .text-btn:focus-visible {
    color: #e4e1e9;
    outline: none;
  }

  .text-btn:focus-visible {
    text-decoration: underline;
  }
</style>