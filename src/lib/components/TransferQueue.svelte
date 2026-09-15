<!-- src/lib/components/TransferQueue.svelte -->
<script lang="ts">
  import { transferQueue } from '../store/queue'

  let { items, isProcessing } = $transferQueue

  // Reactively update local vars when store changes
  $: {
    items = $transferQueue.items
    isProcessing = $transferQueue.isProcessing
  }

  function handlePause() {
    transferQueue.pause()
  }

  function handleResume() {
    transferQueue.resume()
  }

  function handleClearDone() {
    transferQueue.clearDone()
  }
</script>

<div class="queue-panel">
  <div class="header">
    <h3>File d'attente ({items.length})</h3>
    <div class="controls">
      {#if isProcessing}
        <button class="pause" on:click={handlePause}>Pause</button>
      {:else}
        <button class="resume" on:click={handleResume}>Reprendre</button>
      {/if}
      <button class="clear" on:click={handleClearDone}>Purger</button>
    </div>
  </div>

  <ul class="item-list">
    {#each items as item (item.id)}
      <li class="item {item.status}">
        <span class="name">{item.name}</span>
        <span class="status-badge {item.status}">
          {item.status}
          {#if item.estimatedTimeSec && (item.status === 'pending' || item.status === 'uploading')}
            (~{item.estimatedTimeSec}s)
          {/if}
        </span>
        {#if item.status === 'uploading'}
          <div class="progress-bar">
            <div class="fill" style="width: {item.progress}%"></div>
          </div>
        {/if}
      </li>
    {:else}
      <li class="empty">Aucun transfert en attente</li>
    {/each}
  </ul>
</div>

<style>
  .queue-panel {
    background: #131318;
    border-radius: 28px;
    padding: 16px;
    color: #e4e1e9;
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
    font-size: 0.9rem;
    transition: all 0.2s ease-in-out;
  }

  button:hover {
    background: #256166;
    transform: translateY(-1px);
  }

  button:focus-visible {
    outline: 2px solid #00f2ff;
    outline-offset: 2px;
  }

  .item-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item {
    background: #1b1b21;
    padding: 12px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .name {
    font-weight: 500;
  }

  .status-badge {
    font-size: 0.8rem;
    padding: 2px 6px;
    border-radius: 4px;
    align-self: flex-start;
  }

  .status-badge.pending { background: #303036; color: #e4e1e9; }
  .status-badge.uploading { background: #004f54; color: #00f2ff; }
  .status-badge.done { background: #00e676; color: #000; }
  .status-badge.failed { background: #690005; color: #ffb4ab; }

  .progress-bar {
    height: 4px;
    background: #303036;
    border-radius: 2px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: #00f2ff;
    transition: width 0.3s;
  }

  .empty {
    text-align: center;
    color: #908f9f;
    padding: 16px;
  }
</style>