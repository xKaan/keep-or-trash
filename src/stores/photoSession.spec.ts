import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { usePhotoSession } from './photoSession'
import { getFolderHistory, saveFolderHistory, addRecentFolder } from '../lib/persistence'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../lib/persistence', () => ({
  getFolderHistory: vi.fn(),
  saveFolderHistory: vi.fn(),
  addRecentFolder: vi.fn(),
}))

const mockedInvoke = vi.mocked(invoke)
const mockedGetFolderHistory = vi.mocked(getFolderHistory)
const mockedSaveFolderHistory = vi.mocked(saveFolderHistory)
const mockedAddRecentFolder = vi.mocked(addRecentFolder)

const PHOTOS = [
  { name: 'a.jpg', path: '/photos/a.jpg', size: 100 },
  { name: 'b.jpg', path: '/photos/b.jpg', size: 200 },
  { name: 'c.jpg', path: '/photos/c.jpg', size: 300 },
]

beforeEach(() => {
  setActivePinia(createPinia())
  mockedInvoke.mockReset()
  mockedGetFolderHistory.mockReset()
  mockedSaveFolderHistory.mockReset()
  mockedAddRecentFolder.mockReset()
  mockedGetFolderHistory.mockResolvedValue({ reviewed: [], lastIndex: 0 })
  mockedInvoke.mockImplementation(async (cmd: string) => {
    if (cmd === 'list_photos') return PHOTOS
    if (cmd === 'read_photo') return 'data:image/jpeg;base64,fake'
    return null
  })
})

describe('usePhotoSession', () => {
  it('loads photos and filters out already-reviewed ones', async () => {
    mockedGetFolderHistory.mockResolvedValue({ reviewed: ['a.jpg'], lastIndex: 0 })
    const session = usePhotoSession()

    await session.loadFolder('/photos')

    expect(session.photos.map((p) => p.name)).toEqual(['b.jpg', 'c.jpg'])
    expect(session.currentPhoto?.name).toBe('b.jpg')
    expect(mockedAddRecentFolder).toHaveBeenCalledWith('/photos')
  })

  it('resumes at lastIndex within the filtered list', async () => {
    mockedGetFolderHistory.mockResolvedValue({ reviewed: [], lastIndex: 2 })
    const session = usePhotoSession()

    await session.loadFolder('/photos')

    expect(session.currentPhoto?.name).toBe('c.jpg')
  })

  it('loads the current photo as a data URL', async () => {
    const session = usePhotoSession()
    await session.loadFolder('/photos')
    await nextTick()

    expect(mockedInvoke).toHaveBeenCalledWith('read_photo', { path: '/photos/a.jpg' })
    expect(session.currentSrc).toBe('data:image/jpeg;base64,fake')
  })

  it('keep advances to the next photo without moving the file', async () => {
    const session = usePhotoSession()
    await session.loadFolder('/photos')

    await session.decide('keep')

    expect(mockedInvoke).not.toHaveBeenCalledWith('move_to_trash', expect.anything())
    expect(session.currentPhoto?.name).toBe('b.jpg')
    expect(mockedSaveFolderHistory).toHaveBeenLastCalledWith('/photos', {
      reviewed: ['a.jpg'],
      lastIndex: 1,
    })
  })

  it('trash moves the file and advances to the next photo', async () => {
    const session = usePhotoSession()
    await session.loadFolder('/photos')

    await session.decide('trash')

    expect(mockedInvoke).toHaveBeenCalledWith('move_to_trash', {
      folder: '/photos',
      filename: 'a.jpg',
    })
    expect(session.currentPhoto?.name).toBe('b.jpg')
  })

  it('undo after trash restores the file and steps back', async () => {
    const session = usePhotoSession()
    await session.loadFolder('/photos')
    await session.decide('trash')

    await session.undo()

    expect(mockedInvoke).toHaveBeenCalledWith('undo_move', {
      folder: '/photos',
      filename: 'a.jpg',
    })
    expect(session.currentPhoto?.name).toBe('a.jpg')
    expect(session.canUndo).toBe(false)
  })

  it('undo after keep steps back without touching the disk', async () => {
    const session = usePhotoSession()
    await session.loadFolder('/photos')
    await session.decide('keep')

    await session.undo()

    expect(mockedInvoke).not.toHaveBeenCalledWith('undo_move', expect.anything())
    expect(session.currentPhoto?.name).toBe('a.jpg')
  })

  it('undo with no history is a no-op', async () => {
    const session = usePhotoSession()
    await session.loadFolder('/photos')

    await session.undo()

    expect(session.currentPhoto?.name).toBe('a.jpg')
  })
})
