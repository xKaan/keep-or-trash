import { ref, computed, watch } from 'vue'
import { DEFAULT_THEME, parseTheme, resolveTheme, type Theme, type ResolvedTheme } from '../lib/settings'

export type { Theme, ResolvedTheme }

const STORAGE_KEY = 'keep-or-trash:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
const THEME_ORDER: Theme[] = ['dark', 'light', 'system']

function readStoredTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

const darkQuery = window.matchMedia(DARK_QUERY)
const theme = ref<Theme>(readStoredTheme())
const prefersDark = ref(darkQuery.matches)

darkQuery.addEventListener('change', (event) => {
  prefersDark.value = event.matches
})

const resolvedTheme = computed<ResolvedTheme>(() => resolveTheme(theme.value, prefersDark.value))

watch(
  resolvedTheme,
  (value) => {
    document.documentElement.dataset.theme = value
  },
  { immediate: true },
)

watch(theme, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    return
  }
})

export function useTheme() {
  function setTheme(value: Theme) {
    theme.value = value
  }

  function cycleTheme() {
    const index = THEME_ORDER.indexOf(theme.value)
    theme.value = THEME_ORDER[(index + 1) % THEME_ORDER.length]
  }

  return { theme, resolvedTheme, setTheme, cycleTheme }
}
