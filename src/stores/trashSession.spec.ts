import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useTrashSession } from './trashSession'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

const mockedInvoke = vi.mocked(invoke)

const TRASHED = [
  { name: 'a.jpg', path: '/photos/trash/a.jpg', size: 100 },
  { name: 'b.jpg', path: '/photos/trash/b.jpg', size: 200 },
  { name: 'c.jpg', path: '/photos/trash/c.jpg', size: 300 },
]

beforeEach(() => {
  setActivePinia(createPinia())
  mockedInvoke.mockReset()
  mockedInvoke.mockImplementation(async (cmd: string) => {
    if (cmd === 'list_trash') return TRASHED
    if (cmd === 'read_photo') return 'data:image/jpeg;base64,fake'
    if (cmd === 'delete_permanently') return 2
    return null
  })
})

async function loadedTrash() {
  const trash = useTrashSession()
  await trash.load('/photos')
  return trash
}

describe('useTrashSession — loading', () => {
  it('lists the trashed photos of a folder', async () => {
    const trash = await loadedTrash()

    expect(mockedInvoke).toHaveBeenCalledWith('list_trash', { folder: '/photos' })
    expect(trash.photos.map((p) => p.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    expect(trash.isEmpty).toBe(false)
  })

  it('reports an empty trash', async () => {
    mockedInvoke.mockImplementation(async (cmd: string) => (cmd === 'list_trash' ? [] : null))
    const trash = await loadedTrash()

    expect(trash.isEmpty).toBe(true)
  })

  it('surfaces a listing failure', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('dossier illisible'))
    const trash = await loadedTrash()

    expect(trash.error).toContain('dossier illisible')
  })
})

describe('useTrashSession — selection', () => {
  it('starts with nothing selected', async () => {
    const trash = await loadedTrash()

    expect(trash.selected).toEqual([])
    expect(trash.allSelected).toBe(false)
  })

  it('toggles a photo in and out of the selection', async () => {
    const trash = await loadedTrash()

    trash.toggle('a.jpg')
    expect(trash.selected).toEqual(['a.jpg'])

    trash.toggle('a.jpg')
    expect(trash.selected).toEqual([])
  })

  it('selects and clears every photo', async () => {
    const trash = await loadedTrash()

    trash.selectAll()
    expect(trash.selected).toHaveLength(3)
    expect(trash.allSelected).toBe(true)

    trash.clearSelection()
    expect(trash.selected).toEqual([])
  })
})

describe('useTrashSession — deleting', () => {
  it('deletes the selection and drops those photos from the list', async () => {
    const trash = await loadedTrash()
    trash.toggle('a.jpg')
    trash.toggle('c.jpg')

    await trash.deleteSelected()

    expect(mockedInvoke).toHaveBeenCalledWith('delete_permanently', {
      folder: '/photos',
      filenames: ['a.jpg', 'c.jpg'],
    })
    expect(trash.photos.map((p) => p.name)).toEqual(['b.jpg'])
    expect(trash.selected).toEqual([])
  })

  it('deletes a single photo without needing a selection', async () => {
    const trash = await loadedTrash()

    await trash.deleteOne('b.jpg')

    expect(mockedInvoke).toHaveBeenCalledWith('delete_permanently', {
      folder: '/photos',
      filenames: ['b.jpg'],
    })
    expect(trash.photos.map((p) => p.name)).toEqual(['a.jpg', 'c.jpg'])
  })

  it('does nothing when the selection is empty', async () => {
    const trash = await loadedTrash()

    await trash.deleteSelected()

    expect(mockedInvoke).not.toHaveBeenCalledWith('delete_permanently', expect.anything())
  })

  it('keeps the photos listed when the deletion fails', async () => {
    const trash = await loadedTrash()
    trash.toggle('a.jpg')
    mockedInvoke.mockRejectedValueOnce(new Error('fichier verrouillé'))

    await trash.deleteSelected()

    expect(trash.photos).toHaveLength(3)
    expect(trash.error).toContain('fichier verrouillé')
  })

  it('restores a photo out of the trash', async () => {
    const trash = await loadedTrash()

    await trash.restore('a.jpg')

    expect(mockedInvoke).toHaveBeenCalledWith('undo_move', {
      folder: '/photos',
      filename: 'a.jpg',
    })
    expect(trash.photos.map((p) => p.name)).toEqual(['b.jpg', 'c.jpg'])
  })
})
