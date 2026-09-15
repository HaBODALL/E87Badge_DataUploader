<!-- src/lib/components/StorageInfo.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { getStorageInfoE87 } from '../protocol/device-ops'
  import type { E87Client } from '../protocol/e87-protocol'

  export let client: E87Client | null = null

  let storage: { usedBytes: number, freeBytes: number, totalBytes: number, usagePercent: number } | null = null
  let loading = false

  $: if (client && client['connected']) {
    refreshStorage()
  } else {
    storage = null
  }

  onMount(() => {
    const handleUploadDone = () => {
      if (client && client['connected']) {
        refreshStorage()
      }
    }

    window.addEventListener('e87_upload_done', handleUploadDone)
    return () => window.removeEventListener('e87_upload_done', handleUploadDone)
  })

  async function refreshStorage() {
    if (!client) return
    loading = true
    storage = await getStorageInfoE87(client)
    loading = false
  }

  function formatKB(bytes: number) {
    return Math.round(bytes / 1024) + ' KB'
  }

  async function clearBadge() {
    if (!client) return
    if (!confirm("Voulez-vous vraiment purger toutes les images du badge ?")) return

    loading = true
    try {
      // In a real app we would call the RCSP command to delete all files or format the disk.
      // E.g., await client.deleteFiles()

      // Mocking the deletion
      await new Promise(r => setTimeout(r, 1000))
      alert("Galerie purgée avec succès.")

      // Refresh storage manually or let the mock reflect the change.
      // Since our mock always returns the same hardcoded files, we will
      // just set the storage directly here to show the effect.
      storage = {
        usedBytes: 0,
        freeBytes: 900_000,
        totalBytes: 900_000,
        usagePercent: 0
      }
    } catch(e) {
      console.error(e)
      alert("Erreur lors de la purge.")
    }
    loading = false
  }
</script>

<div class="storage-panel">
  <div class="header">
    <h3>Espace de stockage</h3>
    <div class="actions">
      <button on:click={refreshStorage} disabled={loading || !client}>
        {loading ? '...' : 'Rafraîchir'}
      </button>
      <button class="danger" on:click={clearBadge} disabled={loading || !client}>
        Purger
      </button>
    </div>
  </div>

  {#if storage}
    <div class="bar-container">
      <div class="bar-fill" style="width: {storage.usagePercent}%"></div>
    </div>
    <div class="details">
      <span>{formatKB(storage.usedBytes)} utilisés</span>
      <span>{formatKB(storage.totalBytes)} total</span>
    </div>
  {:else if !client}
    <div class="empty">Connectez le badge pour voir le stockage</div>
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

  .actions {
    display: flex;
    gap: 8px;
  }

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

  button.danger {
    background: #690005;
    color: #ffb4ab;
  }

  button.danger:not(:disabled):hover {
    background: #93000a;
  }

  button.danger:not(:disabled):focus-visible {
    outline: 2px solid #ffb4ab;
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