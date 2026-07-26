import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { PhotoInfo } from '../types'

export const useTrashSession = defineStore('trashSession', () => {
  const folder = ref('')
  const photos = ref<PhotoInfo[]>([])
  const selection = ref<Set<string>>(new Set())
  const thumbnails = ref<Record<string, string>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selected = computed(() => photos.value.map((p) => p.name).filter((n) => selection.value.has(n)))
  const total = computed(() => photos.value.length)
  const isEmpty = computed(() => photos.value.length === 0)
  const allSelected = computed(() => total.value > 0 && selected.value.length === total.value)
  const totalSize = computed(() => photos.value.reduce((sum, p) => sum + p.size, 0))

  async function load(targetFolder: string) {
    loading.value = true
    error.value = null
    selection.value = new Set()
    thumbnails.value = {}
    try {
      folder.value = targetFolder
      photos.value = await invoke<PhotoInfo[]>('list_trash', { folder: targetFolder })
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function loadThumbnail(name: string) {
    if (thumbnails.value[name]) return
    const photo = photos.value.find((p) => p.name === name)
    if (!photo) return
    try {
      thumbnails.value[name] = await invoke<string>('read_photo', { path: photo.path })
    } catch {
      thumbnails.value[name] = ''
    }
  }

  function toggle(name: string) {
    const next = new Set(selection.value)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    selection.value = next
  }

  function selectAll() {
    selection.value = new Set(photos.value.map((p) => p.name))
  }

  function clearSelection() {
    selection.value = new Set()
  }

  function forget(names: string[]) {
    const removed = new Set(names)
    photos.value = photos.value.filter((p) => !removed.has(p.name))
    const next = new Set(selection.value)
    names.forEach((name) => {
      next.delete(name)
      delete thumbnails.value[name]
    })
    selection.value = next
  }

  async function deletePermanently(filenames: string[]) {
    if (!filenames.length) return
    error.value = null
    try {
      await invoke('delete_permanently', { folder: folder.value, filenames })
      forget(filenames)
    } catch (e) {
      error.value = String(e)
    }
  }

  async function deleteSelected() {
    await deletePermanently(selected.value)
  }

  async function deleteOne(name: string) {
    await deletePermanently([name])
  }

  async function deleteAll() {
    await deletePermanently(photos.value.map((p) => p.name))
  }

  async function restore(name: string) {
    error.value = null
    try {
      await invoke('undo_move', { folder: folder.value, filename: name })
      forget([name])
    } catch (e) {
      error.value = String(e)
    }
  }

  return {
    folder,
    photos,
    thumbnails,
    loading,
    error,
    selected,
    total,
    isEmpty,
    allSelected,
    totalSize,
    load,
    loadThumbnail,
    toggle,
    selectAll,
    clearSelection,
    deleteSelected,
    deleteOne,
    deleteAll,
    restore,
  }
})
