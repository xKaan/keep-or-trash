import { ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'keep-or-trash:theme'

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

const theme = ref<Theme>(initialTheme())

watch(
  theme,
  (value) => {
    document.documentElement.dataset.theme = value
    localStorage.setItem(STORAGE_KEY, value)
  },
  { immediate: true },
)

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, toggleTheme }
}
