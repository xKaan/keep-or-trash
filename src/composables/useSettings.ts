import { ref, watch } from 'vue'
import {
  DEFAULT_SHORTCUTS,
  assignShortcut,
  parseSettings,
  type Settings,
  type ShortcutAction,
  type ThumbSize,
} from '../lib/settings'

const STORAGE_KEY = 'keep-or-trash:settings'

function readStoredSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY))
  } catch {
    return parseSettings(null)
  }
}

const settings = ref<Settings>(readStoredSettings())

watch(
  () => settings.value.thumbSize,
  (value) => {
    document.documentElement.dataset.thumbSize = value
  },
  { immediate: true },
)

watch(
  settings,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      return
    }
  },
  { deep: true },
)

export function useSettings() {
  function setThumbSize(value: ThumbSize) {
    settings.value.thumbSize = value
  }

  function setShortcut(action: ShortcutAction, key: string): ShortcutAction | null {
    const result = assignShortcut(settings.value.shortcuts, action, key)
    settings.value.shortcuts = result.shortcuts
    return result.evicted
  }

  function resetShortcuts() {
    settings.value.shortcuts = { ...DEFAULT_SHORTCUTS }
  }

  return { settings, setThumbSize, setShortcut, resetShortcuts }
}
