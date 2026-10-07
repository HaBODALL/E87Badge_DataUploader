import { describe, it, expect, beforeEach } from 'vitest'
import { addQueueItem, updateQueueItem, removeQueueItem, getAllQueueItems, clearQueue, type QueueItem } from '../db'
import 'fake-indexeddb/auto'

describe('IndexedDB Queue', () => {
  beforeEach(async () => {
    await clearQueue()
  })

  it('can add and retrieve items', async () => {
    const item: QueueItem = {
      id: 'test-1',
      name: 'Test File',
      data: new Uint8Array([1, 2, 3]),
      status: 'pending',
      progress: 0,
      retries: 0,
      addedAt: Date.now()
    }

    await addQueueItem(item)
    const items = await getAllQueueItems()

    expect(items.length).toBe(1)
    expect(items[0].id).toBe('test-1')
    expect(items[0].name).toBe('Test File')
    expect(items[0].status).toBe('pending')
  })

  it('can update items', async () => {
    const item: QueueItem = {
      id: 'test-2',
      name: 'To Update',
      data: new Uint8Array([1]),
      status: 'pending',
      progress: 0,
      retries: 0,
      addedAt: Date.now()
    }

    await addQueueItem(item)

    item.status = 'uploading'
    item.progress = 50
    await updateQueueItem(item)

    const items = await getAllQueueItems()
    expect(items.length).toBe(1)
    expect(items[0].status).toBe('uploading')
    expect(items[0].progress).toBe(50)
  })

  it('can remove items', async () => {
    const item: QueueItem = {
      id: 'test-3',
      name: 'To Remove',
      data: new Uint8Array([1]),
      status: 'pending',
      progress: 0,
      retries: 0,
      addedAt: Date.now()
    }

    await addQueueItem(item)
    await removeQueueItem('test-3')

    const items = await getAllQueueItems()
    expect(items.length).toBe(0)
  })
})
