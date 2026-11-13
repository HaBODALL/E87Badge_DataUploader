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
    if (level >= 80) return '#00e676'
    if (level >= 20) return '#ffb74d'
    return '#ff5252'
  }
</script>

<header class="app-bar">
  <div class="brand">E87Badge_DataUploader</div>

  <div class="actions">
    {#if connected}
      {#if batteryLevel !== null}
        <div class="battery" style="color: {getBatteryColor(batteryLevel)}">
          ⚡ {batteryLevel}%
        </div>
      {/if}
      <div class="status online">Connecté</div>
    {:else}
      <div class="status offline">Hors ligne</div>
    {/if}
  </div>
</header>

<style>
  .app-bar {
    height: 64px;
    background: #131318;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    color: #e4e1e9;
  }

  .brand {
    font-size: 1.2rem;
    font-weight: bold;
    color: #00f2ff;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .battery {
    font-weight: 500;
  }

  .status {
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .online {
    background: #004f54;
    color: #00f2ff;
  }

  .offline {
    background: #303036;
    color: #908f9f;
  }
</style>