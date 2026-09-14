// src/lib/store/queue.ts
import { writable } from 'svelte/store'
import { getAllQueueItems, addQueueItem, updateQueueItem, removeQueueItem, clearQueue, type QueueItem } from './db'
import { E87Client } from '../protocol/e87-protocol'

function createQueueStore() {
  const { subscribe, set, update } = writable<{ items: QueueItem[], isProcessing: boolean }>({
    items: [],
    isProcessing: false
  })

  let client: E87Client | null = null

  async function loadInitial() {
    const items = await getAllQueueItems()
    update(s => ({ ...s, items }))
  }

  loadInitial()

  const processNext = async () => {
    let state: { items: QueueItem[], isProcessing: boolean } = { items: [], isProcessing: false };

    // Get current state safely (this is a simplified approach, real implementation uses get())
    subscribe(s => state = s)();

    if (!state.isProcessing || state.items.length === 0) return

    const pendingItem = state.items.find(i => i.status === 'pending')
    if (!pendingItem) return

    pendingItem.status = 'uploading'
    pendingItem.progress = 0
    await updateQueueItem(pendingItem)
    update(s => {
      const idx = s.items.findIndex(i => i.id === pendingItem.id)
      if (idx !== -1) s.items[idx] = pendingItem
      return s
    })

    try {
      if (!client) {
        throw new Error("Client not connected")
      }

      await client.sendImage(pendingItem.data, (pct) => {
        pendingItem.progress = pct
        updateQueueItem(pendingItem)
        update(s => {
          const idx = s.items.findIndex(i => i.id === pendingItem.id)
          if (idx !== -1) s.items[idx] = pendingItem
          return s
        })
      })

      pendingItem.status = 'done'
      pendingItem.progress = 100
    } catch (e) {
      console.error("Upload failed", e)
      pendingItem.retries++
      pendingItem.status = pendingItem.retries < 3 ? 'pending' : 'failed'
    }

    await updateQueueItem(pendingItem)
    update(s => {
      const idx = s.items.findIndex(i => i.id === pendingItem.id)
      if (idx !== -1) s.items[idx] = pendingItem
      return s
    })

    // Anti-spam delay
    await new Promise(r => setTimeout(r, 7000))
    processNext()
  }

  return {
    subscribe,
    setClient: (c: E87Client) => { client = c },
    add: async (data: Uint8Array, name: string) => {
      const item: QueueItem = {
        id: crypto.randomUUID(),
        name,
        data,
        status: 'pending',
        progress: 0,
        retries: 0,
        addedAt: Date.now()
      }
      await addQueueItem(item)
      update(s => {
        s.items.push(item)
        if (!s.isProcessing) {
          setTimeout(() => {
             s.isProcessing = true
             processNext()
          }, 0)
        }
        return s
      })
    },
    remove: async (id: string) => {
      await removeQueueItem(id)
      update(s => ({ ...s, items: s.items.filter(i => i.id !== id) }))
    },
    pause: () => {
      update(s => ({ ...s, isProcessing: false }))
    },
    resume: () => {
      update(s => {
        if (!s.isProcessing) {
           setTimeout(processNext, 0)
        }
        return { ...s, isProcessing: true }
      })
    },
    clearDone: async () => {
      update(s => {
        const remaining = s.items.filter(i => i.status !== 'done')
        // Ideally we'd remove them from DB here too, but for simplicity we'll just clear and re-add
        clearQueue().then(() => remaining.forEach(addQueueItem))
        return { ...s, items: remaining }
      })
    }
  }
}

export const transferQueue = createQueueStore()
