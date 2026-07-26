import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { PhotoInfo, Decision } from '../types'
import { getFolderHistory, saveFolderHistory, addRecentFolder } from '../lib/persistence'
import { queued } from '../lib/taskQueue'

const FULL_CACHE_SIZE = 5

export const usePhotoSession = defineStore('photoSession', () => {
  const folder = ref('')
  const photos = ref<PhotoInfo[]>([])
  const index = ref(0)
  const decisions = ref<Record<string, Decision>>({})
  const history = ref<string[]>([])
  const initialReviewed = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentSrc = ref<string | null>(null)
  const thumbnails = ref<Record<string, string>>({})
  const fullImages = new Map<string, string>()

  const currentPhoto = computed<PhotoInfo | null>(() => photos.value[index.value] ?? null)
  const total = computed(() => photos.value.length)
  const decidedCount = computed(() => history.value.length)
  const keptCount = computed(
    () => Object.values(decisions.value).filter((d) => d === 'keep').length,
  )
  const trashedCount = computed(
    () => Object.values(decisions.value).filter((d) => d === 'trash').length,
  )
  const isDone = computed(() => total.value > 0 && decidedCount.value >= total.value)
  const progress = computed(() => `${Math.min(index.value + 1, total.value)} / ${total.value}`)
  const canUndo = computed(() => history.value.length > 0)
  const currentDecision = computed<Decision | null>(() =>
    currentPhoto.value ? (decisions.value[currentPhoto.value.name] ?? null) : null,
  )

  function cacheFull(name: string, src: string) {
    fullImages.delete(name)
    fullImages.set(name, src)
    for (const oldest of fullImages.keys()) {
      if (fullImages.size <= FULL_CACHE_SIZE) break
      fullImages.delete(oldest)
    }
  }

  async function loadFull(photo: PhotoInfo): Promise<string | null> {
    const cached = fullImages.get(photo.name)
    if (cached) {
      cacheFull(photo.name, cached)
      return cached
    }
    try {
      const src = await invoke<string>('read_photo', { path: photo.path })
      cacheFull(photo.name, src)
      return src
    } catch (e) {
      error.value = String(e)
      return null
    }
  }

  watch(
    currentPhoto,
    async (photo) => {
      if (!photo) {
        currentSrc.value = null
        return
      }
      currentSrc.value = fullImages.get(photo.name) ?? null
      const src = await loadFull(photo)
      if (currentPhoto.value?.name === photo.name) currentSrc.value = src

      const neighbours = [photos.value[index.value + 1], photos.value[index.value - 1]]
      for (const neighbour of neighbours) {
        if (neighbour && !fullImages.has(neighbour.name)) void loadFull(neighbour)
      }
    },
    { immediate: true },
  )

  async function loadThumbnail(name: string) {
    if (thumbnails.value[name] !== undefined) return
    const photo = photos.value.find((p) => p.name === name)
    if (!photo) return
    thumbnails.value[name] = ''
    try {
      thumbnails.value[name] = await queued(() =>
        invoke<string>('read_thumbnail', { path: photo.path }),
      )
    } catch {
      thumbnails.value[name] = ''
    }
  }

  async function loadFolder(targetFolder: string) {
    loading.value = true
    error.value = null
    decisions.value = {}
    history.value = []
    thumbnails.value = {}
    fullImages.clear()
    try {
      const all = await invoke<PhotoInfo[]>('list_photos', { folder: targetFolder })
      const folderHistory = await getFolderHistory(targetFolder)
      const remaining = all.filter((p) => !folderHistory.reviewed.includes(p.name))
      folder.value = targetFolder
      photos.value = remaining
      initialReviewed.value = folderHistory.reviewed
      index.value = Math.min(folderHistory.lastIndex, Math.max(0, remaining.length - 1))
      await addRecentFolder(targetFolder)
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function persist() {
    const kept = history.value.filter((name) => decisions.value[name] === 'keep')
    await saveFolderHistory(folder.value, {
      reviewed: [...initialReviewed.value, ...kept],
      lastIndex: index.value,
    })
  }

  function nextUndecidedFrom(start: number): number | null {
    for (let i = start; i < photos.value.length; i += 1) {
      if (!decisions.value[photos.value[i].name]) return i
    }
    for (let i = 0; i < start; i += 1) {
      if (!decisions.value[photos.value[i].name]) return i
    }
    return null
  }

  async function decide(action: Decision) {
    const photo = currentPhoto.value
    if (!photo || decisions.value[photo.name]) return
    try {
      if (action === 'trash') {
        await invoke('move_to_trash', { folder: folder.value, filename: photo.name })
      }
      decisions.value[photo.name] = action
      history.value.push(photo.name)
      const next = nextUndecidedFrom(index.value + 1)
      if (next !== null) index.value = next
      await persist()
    } catch (e) {
      error.value = String(e)
    }
  }

  async function undo() {
    const name = history.value[history.value.length - 1]
    if (!name) return
    if (decisions.value[name] === 'trash') {
      try {
        await invoke('undo_move', { folder: folder.value, filename: name })
      } catch (e) {
        error.value = String(e)
        return
      }
    }
    history.value.pop()
    delete decisions.value[name]
    const position = photos.value.findIndex((p) => p.name === name)
    if (position !== -1) index.value = position
    await persist()
  }

  function selectPhoto(target: number) {
    if (target >= 0 && target < photos.value.length) index.value = target
  }

  function goPrev() {
    selectPhoto(index.value - 1)
  }

  function goNext() {
    selectPhoto(index.value + 1)
  }

  return {
    folder,
    photos,
    index,
    decisions,
    loading,
    error,
    currentSrc,
    thumbnails,
    currentPhoto,
    currentDecision,
    total,
    decidedCount,
    keptCount,
    trashedCount,
    isDone,
    progress,
    canUndo,
    loadFolder,
    loadThumbnail,
    decide,
    undo,
    selectPhoto,
    goPrev,
    goNext,
  }
})
