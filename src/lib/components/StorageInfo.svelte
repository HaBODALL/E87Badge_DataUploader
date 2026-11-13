<!-- src/lib/components/StorageInfo.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { getStorageInfoE87 } from '../protocol/device-ops'
  import type { E87Client } from '../protocol/e87-protocol'

  export let client: E87Client
  export let connected = false

  let storage: Awaited<ReturnType<typeof getStorageInfoE87>> = null
  let loading = false

  $: if (connected) {
    void refreshStorage()
  } else {
    storage = null
  }

  onMount(() => {
    window.addEventListener('e87_upload_done', refreshStorage)
    return () => window.removeEventListener('e87_upload_done', refreshStorage)
  })

  async function refreshStorage() {
    if (!connected) return
    loading = true
    const info = await getStorageInfoE87(client)
    if (connected) storage = info
    loading = false
  }

  function formatKB(bytes: number) {
    return Math.round(bytes / 1024) + ' KB'
  }
</script>

<div class="storage-panel">
  <div class="header">
    <h3>Espace de stockage</h3>
    <button on:click={refreshStorage} disabled={loading || !connected}>
      {loading ? '...' : 'Rafraîchir'}
    </button>
  </div>

  {#if storage}
    <div class="bar-container">
      <div class="bar-fill" style="width: {storage.usagePercent}%"></div>
    </div>
    <div class="details">
      <span>{formatKB(storage.usedBytes)} utilisés</span>
      <span>{formatKB(storage.totalBytes)} total</span>
    </div>
  {:else if !connected}
    <div class="empty">Connectez le badge pour voir le stockage</div>
  {:else if loading}
    <div class="empty">Lecture…</div>
  {:else}
    <div class="empty">Erreur de lecture</div>
  {/if}
</div>

<style>
  .storage-panel {
    background: #131318;
    border-radius: 28px;
    padding: 16px;
    color: #e4e1e9;
    margin-top: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  h3 { margin: 0; font-size: 1.1rem; }


  button {
    background: #1e4d51;
    color: #00f2ff;
    border: none;
    border-radius: 12px;
    padding: 4px 12px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  button:not(:disabled):hover {
    background: #256166;
    transform: translateY(-1px);
  }

  button:not(:disabled):focus-visible {
    outline: 2px solid #00f2ff;
    outline-offset: 2px;
  }




  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .bar-container {
    height: 8px;
    background: #303036;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .bar-fill {
    height: 100%;
    background: #bc00ff; /* Secondary color for storage */
    transition: width 0.3s;
  }

  .details {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #908f9f;
  }

  .empty {
    text-align: center;
    color: #908f9f;
    padding: 8px;
    font-size: 0.9rem;
  }
</style>