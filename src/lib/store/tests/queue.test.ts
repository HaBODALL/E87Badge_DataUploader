import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { transferQueue } from '../queue'
import { clearQueue, getAllQueueItems } from '../db'
import { get } from 'svelte/store'

describe('transferQueue store', () => {
  beforeEach(async () => {
    transferQueue.pause()
    const state = get(transferQueue)
    for (const item of [...state.items]) {
      await transferQueue.remove(item.id)
    }
    await clearQueue()
  })

  it('can add an item to the transfer queue store and DB', async () => {
    transferQueue.pause()
    const testData = new Uint8Array([0xff, 0xd8, 0xff])
    await transferQueue.add(testData, 'test-image.jpg')

    const state = get(transferQueue)
    expect(state.items.length).toBe(1)
    expect(state.items[0].name).toBe('test-image.jpg')

    const dbItems = await getAllQueueItems()
    expect(dbItems.length).toBe(1)
    expect(dbItems[0].name).toBe('test-image.jpg')
  })

  it('can remove an item from the queue store and DB', async () => {
    transferQueue.pause()
    const testData = new Uint8Array([0x01, 0x02])
    await transferQueue.add(testData, 'file-to-remove.jpg')

    let state = get(transferQueue)
    const itemId = state.items[0].id

    await transferQueue.remove(itemId)

    state = get(transferQueue)
    expect(state.items.length).toBe(0)

    const dbItems = await getAllQueueItems()
    expect(dbItems.length).toBe(0)
  })

  it('can pause and resume queue processing', () => {
    transferQueue.pause()
    let state = get(transferQueue)
    expect(state.isProcessing).toBe(false)

    transferQueue.resume()
    state = get(transferQueue)
    expect(state.isProcessing).toBe(true)
  })

  it('clears items with status "done" when clearDone is called', async () => {
    transferQueue.pause()
    await transferQueue.add(new Uint8Array([1]), 'done-item.jpg')
    await transferQueue.add(new Uint8Array([2]), 'pending-item.jpg')

    let state = get(transferQueue)
    expect(state.items.length).toBe(2)

    // Mark first item as done
    state.items[0].status = 'done'

    await transferQueue.clearDone()

    state = get(transferQueue)
    expect(state.items.length).toBe(1)
    expect(state.items[0].name).toBe('pending-item.jpg')
  })
})
