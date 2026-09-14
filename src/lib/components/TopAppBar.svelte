<!-- src/lib/components/TopAppBar.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { E87Client } from '../protocol/e87-protocol'

  export let client: E87Client | null = null

  let batteryLevel: number | null = null
  let isConnected = false

  let batteryInterval: number

  $: {
    isConnected = !!client && client['connected']
  }

  // Auto-refresh battery if connected
  $: if (isConnected) {
    refreshBattery()
    if (!batteryInterval) {
      batteryInterval = window.setInterval(refreshBattery, 30000)
    }
  } else {
    batteryLevel = null
    if (batteryInterval) {
      clearInterval(batteryInterval)
      batteryInterval = 0
    }
  }

  onDestroy(() => {
    if (batteryInterval) clearInterval(batteryInterval)
  })

  async function refreshBattery() {
    if (client) {
      const lvl = await client.getBatteryLevel()
      if (lvl > 0) batteryLevel = lvl
    }
  }

  function getBatteryColor(level: number) {
    if (level >= 80) return '#00e676'
    if (level >= 20) return '#ffb74d'
    return '#ff5252'
  }
</script>

<header class="app-bar">
  <div class="brand">AuraCast PWA</div>

  <div class="actions">
    {#if isConnected}
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