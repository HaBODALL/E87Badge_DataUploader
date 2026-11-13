<!-- src/lib/components/TopAppBar.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { E87Client } from '../protocol/e87-protocol'

  export let client: E87Client
  export let connected = false

  const BATTERY_REFRESH_MS = 30000

  let batteryLevel: number | null = null
  let batteryInterval = 0

  $: if (connected) {
    startBatteryPolling()
  } else {
    stopBatteryPolling()
  }

  onDestroy(stopBatteryPolling)

  function startBatteryPolling() {
    if (batteryInterval) return
    void refreshBattery()
    batteryInterval = window.setInterval(refreshBattery, BATTERY_REFRESH_MS)
  }

  function stopBatteryPolling() {
    clearInterval(batteryInterval)
    batteryInterval = 0
    batteryLevel = null
  }

  async function refreshBattery() {
    const lvl = await client.getBatteryLevel()
    if (connected && lvl > 0) batteryLevel = lvl
  }

  function getBatteryColor(level: number) {
    if (level >= 50) return 'var(--success)'
    if (level >= 20) return 'var(--warning)'
    return 'var(--danger)'
  }
</script>

<header class="app-bar">
  <div class="brand">
    <img src="favicon.svg" alt="" width="28" height="28" />
    <span>E87 Badge <em>Uploader</em></span>
  </div>

  <div class="actions">
    {#if connected && batteryLevel !== null}
      <div class="battery" title="Batterie du badge" style="--level: {batteryLevel}%; --color: {getBatteryColor(batteryLevel)}">
        <span class="cell" aria-hidden="true"><span></span></span>
        {batteryLevel}%
      </div>
    {/if}
    <div class="status" class:online={connected}>
      <span class="dot" aria-hidden="true"></span>
      {connected ? 'Connecté' : 'Hors ligne'}
    </div>
  </div>
</header>

<style>
  .app-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    height: 60px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    background: rgba(10, 11, 30, 0.75);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 1.05rem;
  }

  .brand em {
    font-style: normal;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .battery {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
  }

  .cell {
    width: 22px;
    height: 11px;
    padding: 1px;
    border: 1.5px solid var(--muted);
    border-radius: 3px;
    box-sizing: border-box;
  }

  .cell span {
    display: block;
    height: 100%;
    width: var(--level);
    background: var(--color);
    border-radius: 1px;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--muted);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
  }

  .status.online {
    background: rgba(61, 220, 151, 0.12);
    color: var(--success);
  }

  .status.online .dot {
    background: var(--success);
    box-shadow: 0 0 8px var(--success);
  }
</style>
