// src/lib/store/queue.ts
import { get, writable } from 'svelte/store'
import { getAllQueueItems, addQueueItem, updateQueueItem, removeQueueItem, type QueueItem } from './db'
import type { E87Client } from '../protocol/e87-protocol'

const MAX_RETRIES = 3
// The badge rejects uploads that follow each other too closely.
const ANTI_SPAM_DELAY_MS = 7000

interface QueueState {
  items: QueueItem[]
  /** false when the user paused the queue. */
  isProcessing: boolean
}

function createQueueStore() {
  const store = writable<QueueState>({ items: [], isProcessing: true })
  const { subscribe, update } = store

  let client: E87Client | null = null
  let running = false

  /** Update one item in the store and, unless `persist` is false, in IndexedDB. */
  async function patch(id: string, changes: Partial<QueueItem>, persist = true) {
    let updated: QueueItem | undefined
    update(s => ({
      ...s,
      items: s.items.map(i => (i.id === id ? (updated = { ...i, ...changes }) : i)),
    }))
    // An item removed meanwhile must not be written back to the DB.
    if (updated && persist) await updateQueueItem(updated)
  }

  async function loadInitial() {
    const stored = await getAllQueueItems()
    for (const item of stored) {
      // An upload interrupted by a reload/crash has to start over.
      if (item.status === 'uploading') {
        item.status = 'pending'
        item.progress = 0
        await updateQueueItem(item)
      }
    }
    update(s => {
      const known = new Set(s.items.map(i => i.id))
      const items = [...stored.filter(i => !known.has(i.id)), ...s.items]
      items.sort((a, b) => a.addedAt - b.addedAt)
      return { ...s, items }
    })
    void process()
  }

  async function upload(item: QueueItem) {
    await patch(item.id, { status: 'uploading', progress: 0 })
    try {
      let lastPct = 0
      await client!.sendImage(item.data, pct => {
        const rounded = Math.floor(pct)
        if (rounded === lastPct) return
        lastPct = rounded
        // Progress is display-only: no need to rewrite the whole image in the DB.
        void patch(item.id, { progress: rounded }, false)
      })
      await patch(item.id, { status: 'done', progress: 100 })
      // Lets components refresh the storage gauge.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('e87_upload_done'))
      }
    } catch (e) {
      console.error('Upload failed', e)
      if (!client?.connected) {
        // A lost connection is not the item's fault: keep it for the next connection.
        await patch(item.id, { status: 'pending', progress: 0 })
        return
      }
      const retries = item.retries + 1
      await patch(item.id, {
        retries,
        progress: 0,
        status: retries < MAX_RETRIES ? 'pending' : 'failed',
      })
    }
  }

  /** Upload pending items one by one while connected and not paused. */
  async function process() {
    if (running) return
    running = true
    try {
      while (true) {
        const state = get(store)
        if (!state.isProcessing || !client?.connected) break
        const next = state.items.find(i => i.status === 'pending')
        if (!next) break
        await upload(next)
        if (get(store).items.some(i => i.status === 'pending')) {
          await new Promise(r => setTimeout(r, ANTI_SPAM_DELAY_MS))
        }
      }
    } finally {
      running = false
    }
  }

  void loadInitial()

  return {
    subscribe,
    setClient: (c: E87Client) => { client = c },
    /** Start uploading if possible (call it once the badge is connected). */
    process,
    add: async (data: Uint8Array, name: string) => {
      const item: QueueItem = {
        id: crypto.randomUUID(),
        name,
        data,
        status: 'pending',
        progress: 0,
        retries: 0,
        estimatedTimeSec: Math.ceil(data.length / (490 * 8)) * 1.5, // very rough estimation
        addedAt: Date.now(),
      }
      await addQueueItem(item)
      update(s => ({ ...s, items: [...s.items, item] }))
      void process()
    },
    remove: async (id: string) => {
      await removeQueueItem(id)
      update(s => ({ ...s, items: s.items.filter(i => i.id !== id) }))
    },
    pause: () => {
      update(s => ({ ...s, isProcessing: false }))
    },
    resume: () => {
      update(s => ({ ...s, isProcessing: true }))
      void process()
    },
    clearDone: async () => {
      const done = get(store).items.filter(i => i.status === 'done')
      update(s => ({ ...s, items: s.items.filter(i => i.status !== 'done') }))
      await Promise.all(done.map(i => removeQueueItem(i.id)))
    },
  }
}

export const transferQueue = createQueueStore()
