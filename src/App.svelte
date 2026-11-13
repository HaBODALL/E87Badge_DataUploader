<!-- src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import TopAppBar from './lib/components/TopAppBar.svelte'
  import CircularCropTool from './lib/components/CircularCropTool.svelte'
  import TransferQueue from './lib/components/TransferQueue.svelte'
  import StorageInfo from './lib/components/StorageInfo.svelte'
  import { E87Client } from './lib/protocol/e87-protocol'
  import { transferQueue } from './lib/store/queue'

  const client = new E87Client()
  client.onDisconnect = () => { isConnected = false }
  transferQueue.setClient(client)

  let isConnected = false
  let isConnecting = false
  let connectError = ''

  let selectedImageUrl = ''
  let isDraggingOver = false

  onMount(() => () => {
    clearSelection()
    void client.disconnect()
  })

  async function connect() {
    isConnecting = true
    connectError = ''
    try {
      await client.connect()
      isConnected = true
      void transferQueue.process()
    } catch (e) {
      // Closing the browser's device picker is not an error worth showing.
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
        console.error('Connection failed', e)
        connectError = e instanceof Error ? e.message : String(e)
      }
    } finally {
      isConnecting = false
    }
  }

  function disconnect() {
    void client.disconnect()
    isConnected = false
  }

  function handleFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) handleFile(file)
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
    const file = event.dataTransfer?.files[0]
    if (file) handleFile(file)
  }

  function clearSelection() {
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl)
    selectedImageUrl = ''
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez déposer une image.')
      return
    }
    clearSelection()
    selectedImageUrl = URL.createObjectURL(file)
  }

  function handleCrop(event: CustomEvent<{ finalCanvas: HTMLCanvasElement }>) {
    event.detail.finalCanvas.toBlob(async blob => {
      if (!blob) return
      const bytes = new Uint8Array(await blob.arrayBuffer())
      await transferQueue.add(bytes, `img_${Date.now()}.jpg`)
      clearSelection()
    }, 'image/jpeg', 0.88)
  }
</script>

<main>
  <TopAppBar {client} connected={isConnected} />

  <div class="content">
    <div class="connection-card">
      {#if !isConnected}
        <h2>Connectez votre badge E87</h2>
        <p>Utilisez Web Bluetooth pour vous connecter.</p>
        <button class="primary-btn" on:click={connect} disabled={isConnecting}>
          {isConnecting ? 'Connexion…' : 'Connecter'}
        </button>
        {#if connectError}
          <p class="error" role="alert">Connexion impossible : {connectError}</p>
        {/if}
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
              role="group"
              aria-label="Zone de dépôt d'image"
              on:dragenter={handleDragOver}
              on:dragover={handleDragOver}
              on:dragleave={handleDragLeave}
              on:drop={handleDrop}>
              <input type="file" accept="image/*" aria-label="Sélectionner une image" on:change={handleFileSelect} />
              <p>Glissez-déposez ou cliquez pour sélectionner une image</p>
            </div>
          {:else}
            <CircularCropTool imageUrl={selectedImageUrl} on:crop={handleCrop} />
            <button class="text-btn" on:click={clearSelection}>Annuler</button>
          {/if}
        </div>
      </div>

      <div class="right-col">
        <TransferQueue />
        <StorageInfo {client} connected={isConnected} />
      </div>
    </div>
  </div>
</main>

<style>
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

  .file-drop:focus-within {
    outline: 2px solid #00f2ff;
    outline-offset: 2px;
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

  .primary-btn:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .error {
    color: #ffb4ab;
    margin-bottom: 0;
  }

  .primary-btn:not(:disabled):hover {
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