import { load } from '@tauri-apps/plugin-store'

export interface FolderHistory {
  reviewed: string[]
  lastIndex: number
}

const STORE_FILE = 'history.json'
const RECENT_FOLDERS_KEY = '__recentFolders'
const MAX_RECENT_FOLDERS = 5

async function getStore() {
  return load(STORE_FILE, { autoSave: false })
}

export async function getFolderHistory(folder: string): Promise<FolderHistory> {
  const store = await getStore()
  const value = await store.get<FolderHistory>(folder)
  return value ?? { reviewed: [], lastIndex: 0 }
}

export async function saveFolderHistory(folder: string, history: FolderHistory): Promise<void> {
  const store = await getStore()
  await store.set(folder, history)
  await store.save()
}

export async function getRecentFolders(): Promise<string[]> {
  const store = await getStore()
  return (await store.get<string[]>(RECENT_FOLDERS_KEY)) ?? []
}

export async function addRecentFolder(folder: string): Promise<void> {
  const store = await getStore()
  const current = (await store.get<string[]>(RECENT_FOLDERS_KEY)) ?? []
  const updated = [folder, ...current.filter((f) => f !== folder)].slice(0, MAX_RECENT_FOLDERS)
  await store.set(RECENT_FOLDERS_KEY, updated)
  await store.save()
}
