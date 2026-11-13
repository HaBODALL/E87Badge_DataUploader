<!-- src/lib/components/TransferQueue.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import { transferQueue } from '../store/queue'
  import type { QueueItem } from '../store/db'

  const STATUS_LABELS: Record<QueueItem['status'], string> = {
    pending: 'En attente',
    uploading: 'Envoi',
    done: 'Envoyé',
    failed: 'Échec',
  }

  $: ({ items, isProcessing } = $transferQueue)
  $: hasDone = items.some(i => i.status === 'done')

  // Blob URLs for the thumbnails, released as soon as their item leaves the queue.
  const thumbs = new Map<string, string>()

  function thumb(item: QueueItem): string {
    let url = thumbs.get(item.id)
    if (!url) {
      url = URL.createObjectURL(new Blob([item.data as BlobPart], { type: 'image/jpeg' }))
      thumbs.set(item.id, url)
    }
    return url
  }

  $: {
    const ids = new Set(items.map(i => i.id))
    for (const [id, url] of thumbs) {
      if (!ids.has(id)) {
        URL.revokeObjectURL(url)
        thumbs.delete(id)
      }
    }
  }

  onDestroy(() => thumbs.forEach(url => URL.revokeObjectURL(url)))
</script>

<section class="card">
  <div class="header">
    <h3 class="card-title">File d'attente <span class="count">{items.length}</span></h3>
    <div class="controls">
      {#if hasDone}
        <button class="btn btn-ghost btn-sm" on:click={transferQueue.clearDone}>Retirer les envoyés</button>
      {/if}
      {#if isProcessing}
        <button class="btn btn-soft btn-sm" on:click={transferQueue.pause}>Pause</button>
      {:else}
        <button class="btn btn-soft btn-sm" on:click={transferQueue.resume}>Reprendre</button>
      {/if}
    </div>
  </div>

  <ul class="item-list">
    {#each items as item (item.id)}
      <li class="item">
        <img class="thumb" src={thumb(item)} alt="" width="44" height="44" />
        <div class="info">
          <span class="name">{item.name}</span>
          {#if item.status === 'uploading'}
            <div class="progress" role="progressbar" aria-label="Envoi de {item.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow={item.progress}>
              <div class="fill" style="width: {item.progress}%"></div>
            </div>
          {:else}
            <span class="status {item.status}">
              {STATUS_LABELS[item.status]}
              {#if item.status === 'pending' && item.estimatedTimeSec}
                · env. {item.estimatedTimeSec} s
              {/if}
            </span>
          {/if}
        </div>
        {#if item.status === 'uploading'}
          <span class="pct">{item.progress}%</span>
        {:else}
          <button class="remove" aria-label="Retirer {item.name}" on:click={() => transferQueue.remove(item.id)}>✕</button>
        {/if}
      </li>
    {:else}
      <li class="empty muted">Aucune image en attente.<br />Recadrez une image pour l'ajouter ici.</li>
    {/each}
  </ul>
</section>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .count {
    margin-left: 4px;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--muted);
    font-size: 0.8rem;
  }

  .controls {
    display: flex;
    gap: 8px;
  }

  .item-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 14px;
    background: var(--surface-2);
  }

  .thumb {
    flex: none;
    border-radius: 50%;
    object-fit: cover;
    background: #000;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 6px;
  }

  .name {
    font-weight: 500;
    font-size: 0.92rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .status.done { color: var(--success); }
  .status.failed { color: var(--danger); }

  .progress {
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    border-radius: 3px;
    transition: width 0.3s;
  }

  .pct {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    color: var(--accent);
  }

  .remove {
    flex: none;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  .remove:hover,
  .remove:focus-visible {
    background: rgba(255, 107, 107, 0.15);
    color: var(--danger);
    outline: none;
  }

  .empty {
    text-align: center;
    padding: 20px 8px;
    font-size: 0.9rem;
    line-height: 1.5;
  }
</style>
