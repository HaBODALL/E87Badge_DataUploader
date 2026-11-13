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
    <section class="card connection" class:connected={isConnected}>
      {#if !isConnected}
        <div class="badge-art" aria-hidden="true"><span></span></div>
        <div class="connection-text">
          <h2>Connectez votre badge</h2>
          <p class="muted">Allumez le badge E87 / L8, puis associez-le en Bluetooth.</p>
          {#if connectError}
            <p class="error" role="alert">Connexion impossible : {connectError}</p>
          {/if}
        </div>
        <button class="btn btn-primary" on:click={connect} disabled={isConnecting}>
          {isConnecting ? 'Connexion…' : 'Connecter'}
        </button>
      {:else}
        <div class="badge-art on" aria-hidden="true"><span></span></div>
        <div class="connection-text">
          <h2>{client.connection?.device.name ?? 'Badge'} connecté</h2>
          <p class="muted">Les images en file d'attente sont envoyées automatiquement.</p>
        </div>
        <button class="btn btn-ghost" on:click={disconnect}>Déconnecter</button>
      {/if}
    </section>

    <div class="main-grid">
      <section class="card">
        <h3 class="card-title">Nouvelle image</h3>
        {#if !selectedImageUrl}
          <div class="file-drop" class:drag-over={isDraggingOver}
            role="group"
            aria-label="Zone de dépôt d'image"
            on:dragenter={handleDragOver}
            on:dragover={handleDragOver}
            on:dragleave={handleDragLeave}
            on:drop={handleDrop}>
            <input type="file" accept="image/*" aria-label="Sélectionner une image" on:change={handleFileSelect} />
            <div class="drop-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 16V5m0 0-4 4m4-4 4 4" /><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
              </svg>
            </div>
            <p><strong>Déposez une image</strong></p>
            <p class="muted">ou cliquez pour en choisir une</p>
          </div>
        {:else}
          <CircularCropTool imageUrl={selectedImageUrl} on:crop={handleCrop} />
          <button class="btn btn-ghost cancel" on:click={clearSelection}>Annuler</button>
        {/if}
      </section>

      <div class="right-col">
        <TransferQueue />
        <StorageInfo {client} connected={isConnected} />
      </div>
    </div>
  </div>
</main>

<style>
  .content {
    padding: 24px 16px 48px;
    max-width: 1040px;
    margin: 0 auto;
    box-sizing: border-box;
    display: grid;
    gap: 20px;
  }

  .connection {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    background: linear-gradient(135deg, rgba(0, 242, 255, 0.08), rgba(188, 0, 255, 0.08)), var(--surface);
  }

  .connection-text {
    flex: 1 1 220px;
    display: grid;
    gap: 4px;
  }

  .connection h2 {
    font-size: 1.15rem;
  }

  .badge-art {
    width: 56px;
    height: 56px;
    flex: none;
    border-radius: 50%;
    border: 3px solid var(--surface-2);
    display: grid;
    place-items: center;
    background: #06071a;
  }

  .badge-art span {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--muted);
  }

  .badge-art.on {
    border-color: var(--accent);
    box-shadow: 0 0 24px rgba(0, 242, 255, 0.35);
  }

  .badge-art.on span {
    background: var(--accent);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    50% { transform: scale(1.5); opacity: 0.6; }
  }

  .error {
    color: var(--danger);
    font-size: 0.9rem;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: start;
  }

  @media (min-width: 820px) {
    .main-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }

  .right-col {
    display: grid;
    gap: 20px;
  }

  .file-drop {
    position: relative;
    margin-top: 16px;
    padding: 36px 16px;
    border: 2px dashed rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    text-align: center;
    display: grid;
    justify-items: center;
    gap: 6px;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .drop-circle {
    width: 96px;
    height: 96px;
    margin-bottom: 10px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--accent);
    background: var(--accent-soft);
    transition: transform 0.2s ease;
  }

  .file-drop:hover,
  .file-drop:focus-within,
  .file-drop.drag-over {
    border-color: var(--accent);
    background: rgba(0, 242, 255, 0.05);
  }

  .file-drop:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .file-drop.drag-over .drop-circle,
  .file-drop:hover .drop-circle {
    transform: scale(1.08);
  }

  .file-drop input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .cancel {
    width: 100%;
    margin-top: 12px;
  }
</style>
