import { ref, watch } from 'vue'
import {
  DEFAULT_SHORTCUTS,
  assignShortcut,
  clampRailWidth,
  clampThumbScale,
  parseSettings,
  type Locale,
  type Settings,
  type ShortcutAction,
  type ViewMode,
} from '../lib/settings'
import { i18n } from '../i18n'

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
  () => settings.value.thumbScale,
  (value) => {
    document.documentElement.style.setProperty('--thumb-scale', `${value}px`)
  },
  { immediate: true },
)

watch(
  () => settings.value.railWidth,
  (value) => {
    document.documentElement.style.setProperty('--rail-width', `${value}px`)
  },
  { immediate: true },
)

watch(
  () => settings.value.locale,
  (value) => {
    i18n.global.locale.value = value
  },
  { immediate: true },
)

let persistTimer: ReturnType<typeof setTimeout> | undefined

watch(
  settings,
  (value) => {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        return
      }
    }, 100)
  },
  { deep: true },
)

export function useSettings() {
  function setViewMode(value: ViewMode) {
    settings.value.viewMode = value
  }

  function setThumbScale(value: number) {
    settings.value.thumbScale = clampThumbScale(value)
  }

  function setRailWidth(value: number) {
    settings.value.railWidth = clampRailWidth(value)
  }

  function setLocale(value: Locale) {
    settings.value.locale = value
  }

  function setShortcut(action: ShortcutAction, key: string): ShortcutAction | null {
    const result = assignShortcut(settings.value.shortcuts, action, key)
    settings.value.shortcuts = result.shortcuts
    return result.evicted
  }

  function resetShortcuts() {
    settings.value.shortcuts = { ...DEFAULT_SHORTCUTS }
  }

  return {
    settings,
    setViewMode,
    setThumbScale,
    setRailWidth,
    setLocale,
    setShortcut,
    resetShortcuts,
  }
}
