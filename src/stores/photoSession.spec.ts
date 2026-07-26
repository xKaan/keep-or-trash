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

async function loadedSession() {
  const session = usePhotoSession()
  await session.loadFolder('/photos')
  return session
}

describe('usePhotoSession — loading', () => {
  it('loads photos and filters out already-reviewed ones', async () => {
    mockedGetFolderHistory.mockResolvedValue({ reviewed: ['a.jpg'], lastIndex: 0 })
    const session = await loadedSession()

    expect(session.photos.map((p) => p.name)).toEqual(['b.jpg', 'c.jpg'])
    expect(session.currentPhoto?.name).toBe('b.jpg')
    expect(mockedAddRecentFolder).toHaveBeenCalledWith('/photos')
  })

  it('resumes at lastIndex within the filtered list', async () => {
    mockedGetFolderHistory.mockResolvedValue({ reviewed: [], lastIndex: 2 })
    const session = await loadedSession()

    expect(session.currentPhoto?.name).toBe('c.jpg')
  })

  it('clamps a stale lastIndex to the last available photo', async () => {
    mockedGetFolderHistory.mockResolvedValue({ reviewed: [], lastIndex: 99 })
    const session = await loadedSession()

    expect(session.currentPhoto?.name).toBe('c.jpg')
  })

  it('loads the current photo as a data URL', async () => {
    const session = await loadedSession()
    await nextTick()

    expect(mockedInvoke).toHaveBeenCalledWith('read_photo', { path: '/photos/a.jpg' })
    expect(session.currentSrc).toBe('data:image/jpeg;base64,fake')
  })
})

describe('usePhotoSession — deciding', () => {
  it('keep advances to the next photo without moving the file', async () => {
    const session = await loadedSession()

    await session.decide('keep')

    expect(mockedInvoke).not.toHaveBeenCalledWith('move_to_trash', expect.anything())
    expect(session.currentPhoto?.name).toBe('b.jpg')
    expect(mockedSaveFolderHistory).toHaveBeenLastCalledWith('/photos', {
      reviewed: ['a.jpg'],
      lastIndex: 1,
    })
  })

  it('trash moves the file and advances to the next photo', async () => {
    const session = await loadedSession()

    await session.decide('trash')

    expect(mockedInvoke).toHaveBeenCalledWith('move_to_trash', {
      folder: '/photos',
      filename: 'a.jpg',
    })
    expect(session.currentPhoto?.name).toBe('b.jpg')
  })

  it('records trashed photos as decided without adding them to reviewed', async () => {
    const session = await loadedSession()

    await session.decide('trash')

    expect(session.trashedCount).toBe(1)
    expect(mockedSaveFolderHistory).toHaveBeenLastCalledWith('/photos', {
      reviewed: [],
      lastIndex: 1,
    })
  })

  it('skips already-decided photos when advancing', async () => {
    const session = await loadedSession()
    session.selectPhoto(1)
    await session.decide('keep')
    session.selectPhoto(0)

    await session.decide('keep')

    expect(session.currentPhoto?.name).toBe('c.jpg')
  })

  it('ignores a second decision on the same photo', async () => {
    const session = await loadedSession()
    await session.decide('keep')
    session.selectPhoto(0)

    await session.decide('trash')

    expect(mockedInvoke).not.toHaveBeenCalledWith('move_to_trash', expect.anything())
    expect(session.decisions['a.jpg']).toBe('keep')
  })

  it('reports the session as done once every photo is decided', async () => {
    const session = await loadedSession()

    await session.decide('keep')
    await session.decide('trash')
    await session.decide('keep')

    expect(session.isDone).toBe(true)
    expect(session.keptCount).toBe(2)
    expect(session.trashedCount).toBe(1)
  })

  it('leaves the decision untouched when the move fails', async () => {
    const session = await loadedSession()
    mockedInvoke.mockRejectedValueOnce(new Error('disque plein'))

    await session.decide('trash')

    expect(session.decisions['a.jpg']).toBeUndefined()
    expect(session.error).toContain('disque plein')
  })
})

describe('usePhotoSession — undo', () => {
  it('undo after trash restores the file and returns to that photo', async () => {
    const session = await loadedSession()
    await session.decide('trash')

    await session.undo()

    expect(mockedInvoke).toHaveBeenCalledWith('undo_move', {
      folder: '/photos',
      filename: 'a.jpg',
    })
    expect(session.currentPhoto?.name).toBe('a.jpg')
    expect(session.canUndo).toBe(false)
  })

  it('undo after keep returns to that photo without touching the disk', async () => {
    const session = await loadedSession()
    await session.decide('keep')

    await session.undo()

    expect(mockedInvoke).not.toHaveBeenCalledWith('undo_move', expect.anything())
    expect(session.currentPhoto?.name).toBe('a.jpg')
    expect(session.decisions['a.jpg']).toBeUndefined()
  })

  it('undoes the most recent decision even after navigating away', async () => {
    const session = await loadedSession()
    await session.decide('keep')
    await session.decide('keep')
    session.selectPhoto(2)

    await session.undo()

    expect(session.currentPhoto?.name).toBe('b.jpg')
    expect(session.decisions['b.jpg']).toBeUndefined()
    expect(session.decisions['a.jpg']).toBe('keep')
  })

  it('undo with no history is a no-op', async () => {
    const session = await loadedSession()

    await session.undo()

    expect(session.currentPhoto?.name).toBe('a.jpg')
  })
})

describe('usePhotoSession — navigation', () => {
  it('moves between photos with goNext and goPrev', async () => {
    const session = await loadedSession()

    session.goNext()
    expect(session.currentPhoto?.name).toBe('b.jpg')

    session.goPrev()
    expect(session.currentPhoto?.name).toBe('a.jpg')
  })

  it('clamps navigation at both ends', async () => {
    const session = await loadedSession()

    session.goPrev()
    expect(session.currentPhoto?.name).toBe('a.jpg')

    session.selectPhoto(2)
    session.goNext()
    expect(session.currentPhoto?.name).toBe('c.jpg')
  })
})

describe('usePhotoSession — thumbnails', () => {
  it('caches a thumbnail and does not re-read it', async () => {
    const session = await loadedSession()
    await nextTick()
    const callsBefore = mockedInvoke.mock.calls.filter((c) => c[0] === 'read_photo').length

    await session.loadThumbnail('a.jpg')

    const callsAfter = mockedInvoke.mock.calls.filter((c) => c[0] === 'read_photo').length
    expect(callsAfter).toBe(callsBefore)
    expect(session.thumbnails['a.jpg']).toBe('data:image/jpeg;base64,fake')
  })

  it('loads a thumbnail for a photo that is not the current one', async () => {
    const session = await loadedSession()

    await session.loadThumbnail('c.jpg')

    expect(mockedInvoke).toHaveBeenCalledWith('read_photo', { path: '/photos/c.jpg' })
    expect(session.thumbnails['c.jpg']).toBe('data:image/jpeg;base64,fake')
  })
})
