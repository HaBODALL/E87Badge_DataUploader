// src/lib/store/db.ts
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'auracast_db'
const DB_VERSION = 1
const STORE_NAME = 'queue'

export interface QueueItem {
  id: string
  name: string
  data: Uint8Array // Image raw data
  status: 'pending' | 'uploading' | 'done' | 'failed'
  progress: number
  retries: number
  addedAt: number
}

let dbPromise: Promise<IDBPDatabase<any>> | null = null

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    })
  }
  return dbPromise
}

export async function addQueueItem(item: QueueItem) {
  const db = await getDB()
  await db.put(STORE_NAME, item)
}

export async function updateQueueItem(item: QueueItem) {
  const db = await getDB()
  await db.put(STORE_NAME, item)
}

export async function removeQueueItem(id: string) {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getAllQueueItems(): Promise<QueueItem[]> {
  const db = await getDB()
  return await db.getAll(STORE_NAME)
}

export async function clearQueue() {
  const db = await getDB()
  await db.clear(STORE_NAME)
}