export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'
export type ThumbSize = 'small' | 'medium' | 'large'
export type ShortcutAction = 'prev' | 'next' | 'keep' | 'trash' | 'undo'
export type Shortcuts = Record<ShortcutAction, string | null>

export interface Settings {
  thumbSize: ThumbSize
  shortcuts: Shortcuts
}

export interface AssignResult {
  shortcuts: Shortcuts
  evicted: ShortcutAction | null
}

export const THEMES: Theme[] = ['light', 'dark', 'system']
export const THUMB_SIZES: ThumbSize[] = ['small', 'medium', 'large']
export const SHORTCUT_ACTIONS: ShortcutAction[] = ['prev', 'next', 'keep', 'trash', 'undo']

export const THEME_LABELS: Record<Theme, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Système',
}

export const THEME_ICONS: Record<Theme, 'sun' | 'moon' | 'monitor'> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
}

export const THUMB_SIZE_LABELS: Record<ThumbSize, string> = {
  small: 'Petit',
  medium: 'Moyen',
  large: 'Grand',
}

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  prev: 'Photo précédente',
  next: 'Photo suivante',
  keep: 'Garder',
  trash: 'Envoyer à la corbeille',
  undo: 'Annuler',
}

export const DEFAULT_THEME: Theme = 'dark'

export const DEFAULT_SHORTCUTS: Shortcuts = {
  prev: 'ArrowLeft',
  next: 'ArrowRight',
  keep: 'k',
  trash: 'd',
  undo: 'Backspace',
}

export const DEFAULT_SETTINGS: Settings = {
  thumbSize: 'medium',
  shortcuts: { ...DEFAULT_SHORTCUTS },
}

const RESERVED_KEYS = ['Escape', 'Tab', '+', '=', '-']
const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta']

const KEY_LABELS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backspace: '⌫',
  Delete: 'Suppr',
  Enter: 'Entrée',
  ' ': 'Espace',
}

export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

export function isReservedKey(key: string): boolean {
  return RESERVED_KEYS.includes(normalizeKey(key))
}

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.includes(key)
}

export function formatKeyLabel(key: string | null): string {
  if (key === null) return 'Non assigné'
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

export function assignShortcut(
  shortcuts: Shortcuts,
  action: ShortcutAction,
  key: string,
): AssignResult {
  const normalized = normalizeKey(key)
  const evicted =
    SHORTCUT_ACTIONS.find((other) => other !== action && shortcuts[other] === normalized) ?? null
  const next: Shortcuts = { ...shortcuts, [action]: normalized }
  if (evicted) next[evicted] = null
  return { shortcuts: next, evicted }
}

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}

export function parseTheme(raw: string | null): Theme {
  return THEMES.includes(raw as Theme) ? (raw as Theme) : DEFAULT_THEME
}

export function parseSettings(raw: string | null): Settings {
  let data: unknown = null
  try {
    data = raw === null ? null : JSON.parse(raw)
  } catch {
    data = null
  }

  const source = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const rawShortcuts = (
    source.shortcuts !== null && typeof source.shortcuts === 'object' ? source.shortcuts : {}
  ) as Record<string, unknown>

  const shortcuts: Shortcuts = { ...DEFAULT_SHORTCUTS }
  for (const action of SHORTCUT_ACTIONS) {
    const value = rawShortcuts[action]
    if (value === null) shortcuts[action] = null
    else if (typeof value === 'string' && value !== '') shortcuts[action] = normalizeKey(value)
  }

  return {
    thumbSize: THUMB_SIZES.includes(source.thumbSize as ThumbSize)
      ? (source.thumbSize as ThumbSize)
      : DEFAULT_SETTINGS.thumbSize,
    shortcuts,
  }
}
