import { describe, it, expect, vi, beforeEach } from 'vitest'
import { load } from '@tauri-apps/plugin-store'
import {
  getFolderHistory,
  saveFolderHistory,
  getRecentFolders,
  addRecentFolder,
} from './persistence'

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(),
}))

const mockedLoad = vi.mocked(load)

function createFakeStore() {
  const data = new Map<string, unknown>()
  return {
    get: vi.fn(async (key: string) => data.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value)
    }),
    save: vi.fn(async () => {}),
  }
}

beforeEach(() => {
  mockedLoad.mockReset()
})

describe('persistence', () => {
  it('returns an empty history when nothing was stored yet', async () => {
    const store = createFakeStore()
    mockedLoad.mockResolvedValue(store as never)

    const history = await getFolderHistory('/photos')

    expect(history).toEqual({ reviewed: [], lastIndex: 0 })
  })

  it('saves and reloads folder history under the folder path key', async () => {
    const store = createFakeStore()
    mockedLoad.mockResolvedValue(store as never)

    await saveFolderHistory('/photos', { reviewed: ['a.jpg'], lastIndex: 1 })
    const history = await getFolderHistory('/photos')

    expect(history).toEqual({ reviewed: ['a.jpg'], lastIndex: 1 })
    expect(store.save).toHaveBeenCalled()
  })

  it('adds a folder to the front of the recent folders list', async () => {
    const store = createFakeStore()
    mockedLoad.mockResolvedValue(store as never)

    await addRecentFolder('/a')
    await addRecentFolder('/b')
    const recents = await getRecentFolders()

    expect(recents).toEqual(['/b', '/a'])
  })

  it('moves a re-opened folder back to the front without duplicating it', async () => {
    const store = createFakeStore()
    mockedLoad.mockResolvedValue(store as never)

    await addRecentFolder('/a')
    await addRecentFolder('/b')
    await addRecentFolder('/a')
    const recents = await getRecentFolders()

    expect(recents).toEqual(['/a', '/b'])
  })

  it('keeps only the 5 most recent folders', async () => {
    const store = createFakeStore()
    mockedLoad.mockResolvedValue(store as never)

    for (const folder of ['/1', '/2', '/3', '/4', '/5', '/6']) {
      await addRecentFolder(folder)
    }
    const recents = await getRecentFolders()

    expect(recents).toEqual(['/6', '/5', '/4', '/3', '/2'])
  })
})
