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
    return Math.round(bytes / 1024) + ' Ko'
  }
</script>

<section class="card">
  <div class="header">
    <h3 class="card-title">Stockage du badge</h3>
    <button class="btn btn-soft btn-sm" on:click={refreshStorage} disabled={loading || !connected}>
      {loading ? 'Lecture…' : 'Rafraîchir'}
    </button>
  </div>

  {#if storage}
    <div class="figures">
      <strong>{formatKB(storage.freeBytes)}</strong>
      <span class="muted">libres sur {formatKB(storage.totalBytes)} (estimation)</span>
    </div>
    <div class="bar" role="progressbar" aria-label="Espace utilisé" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(storage.usagePercent)}>
      <div class="fill" class:full={storage.usagePercent > 85} style="width: {storage.usagePercent}%"></div>
    </div>
  {:else if !connected}
    <p class="muted empty">Connectez le badge pour voir le stockage.</p>
  {:else if loading}
    <p class="muted empty">Lecture…</p>
  {:else}
    <p class="muted empty">Lecture impossible.</p>
  {/if}
</section>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .figures {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 0.9rem;
  }

  .figures strong {
    font-size: 1.4rem;
  }

  .bar {
    height: 8px;
    background: var(--surface-2);
    border-radius: 4px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    border-radius: 4px;
    transition: width 0.3s;
  }

  .fill.full {
    background: var(--danger);
  }

  .empty {
    font-size: 0.9rem;
  }
</style>
