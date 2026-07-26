import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { PhotoInfo, Decision, HistoryEntry } from '../types'
import { getFolderHistory, saveFolderHistory, addRecentFolder } from '../lib/persistence'

export const usePhotoSession = defineStore('photoSession', () => {
  const folder = ref('')
  const photos = ref<PhotoInfo[]>([])
  const index = ref(0)
  const initialReviewed = ref<string[]>([])
  const sessionHistory = ref<HistoryEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentSrc = ref<string | null>(null)

  const currentPhoto = computed<PhotoInfo | null>(() => photos.value[index.value] ?? null)
  const total = computed(() => photos.value.length)
  const isDone = computed(() => index.value >= photos.value.length)
  const progress = computed(() => `${Math.min(index.value + 1, total.value)}/${total.value}`)
  const canUndo = computed(() => sessionHistory.value.length > 0)

  watch(
    currentPhoto,
    async (photo) => {
      currentSrc.value = null
      if (!photo) return
      try {
        currentSrc.value = await invoke<string>('read_photo', { path: photo.path })
      } catch (e) {
        error.value = String(e)
      }
    },
    { immediate: true },
  )

  async function loadFolder(targetFolder: string) {
    loading.value = true
    error.value = null
    sessionHistory.value = []
    try {
      const all = await invoke<PhotoInfo[]>('list_photos', { folder: targetFolder })
      const history = await getFolderHistory(targetFolder)
      const remaining = all.filter((p) => !history.reviewed.includes(p.name))
      folder.value = targetFolder
      photos.value = remaining
      initialReviewed.value = history.reviewed
      index.value = Math.min(history.lastIndex, remaining.length)
      await addRecentFolder(targetFolder)
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function persist() {
    const keptThisSession = sessionHistory.value
      .filter((h) => h.action === 'keep')
      .map((h) => h.filename)
    const reviewed = [...initialReviewed.value, ...keptThisSession]
    await saveFolderHistory(folder.value, { reviewed, lastIndex: index.value })
  }

  async function decide(action: Decision) {
    const photo = currentPhoto.value
    if (!photo) return
    try {
      if (action === 'trash') {
        await invoke('move_to_trash', { folder: folder.value, filename: photo.name })
      }
      sessionHistory.value.push({ filename: photo.name, action })
      index.value += 1
      await persist()
    } catch (e) {
      error.value = String(e)
    }
  }

  async function undo() {
    const last = sessionHistory.value[sessionHistory.value.length - 1]
    if (!last) return
    if (last.action === 'trash') {
      try {
        await invoke('undo_move', { folder: folder.value, filename: last.filename })
      } catch (e) {
        error.value = String(e)
        return
      }
    }
    sessionHistory.value.pop()
    index.value = Math.max(0, index.value - 1)
    await persist()
  }

  return {
    folder,
    photos,
    index,
    loading,
    error,
    currentSrc,
    currentPhoto,
    total,
    isDone,
    progress,
    canUndo,
    loadFolder,
    decide,
    undo,
  }
})
