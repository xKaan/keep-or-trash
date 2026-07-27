export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'
export type ViewMode = 'cards' | 'list' | 'dense'
export type Locale = 'en' | 'fr'
export type ShortcutAction = 'prev' | 'next' | 'keep' | 'trash' | 'undo' | 'rotate'
export type Shortcuts = Record<ShortcutAction, string | null>

export interface Settings {
  viewMode: ViewMode
  thumbScale: number
  railWidth: number
  locale: Locale
  shortcuts: Shortcuts
}

export interface AssignResult {
  shortcuts: Shortcuts
  evicted: ShortcutAction | null
}

export const THEMES: Theme[] = ['light', 'dark', 'system']
export const VIEW_MODES: ViewMode[] = ['cards', 'list', 'dense']
export const LOCALES: Locale[] = ['en', 'fr']
export const SHORTCUT_ACTIONS: ShortcutAction[] = ['prev', 'next', 'keep', 'trash', 'undo', 'rotate']

export const THEME_ICONS: Record<Theme, 'sun' | 'moon' | 'monitor'> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
}

export const DEFAULT_THEME: Theme = 'dark'
export const DEFAULT_LOCALE: Locale = 'en'
export const DEFAULT_VIEW_MODE: ViewMode = 'cards'

export const THUMB_SCALE_MIN = 90
export const THUMB_SCALE_MAX = 320
export const DEFAULT_THUMB_SCALE = 190

export const RAIL_WIDTH_MIN = 220
export const RAIL_WIDTH_MAX = 480
export const DEFAULT_RAIL_WIDTH = 410

export function clampThumbScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_THUMB_SCALE
  return Math.min(THUMB_SCALE_MAX, Math.max(THUMB_SCALE_MIN, value))
}

export function clampRailWidth(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RAIL_WIDTH
  return Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, value))
}

export const DEFAULT_SHORTCUTS: Shortcuts = {
  prev: 'ArrowLeft',
  next: 'ArrowRight',
  keep: 'k',
  trash: 'd',
  undo: 'Backspace',
  rotate: 'r',
}

export const DEFAULT_SETTINGS: Settings = {
  viewMode: DEFAULT_VIEW_MODE,
  thumbScale: DEFAULT_THUMB_SCALE,
  railWidth: DEFAULT_RAIL_WIDTH,
  locale: DEFAULT_LOCALE,
  shortcuts: { ...DEFAULT_SHORTCUTS },
}

const RESERVED_KEYS = ['Escape', 'Tab', '+', '=', '-']
const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta']

export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

export function isReservedKey(key: string): boolean {
  return RESERVED_KEYS.includes(normalizeKey(key))
}

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.includes(key)
}

export function formatKeyLabel(
  key: string | null,
  keyLabels: Record<string, string>,
  unassignedLabel: string,
): string {
  if (key === null) return unassignedLabel
  return keyLabels[key] ?? (key.length === 1 ? key.toUpperCase() : key)
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
    viewMode: VIEW_MODES.includes(source.viewMode as ViewMode)
      ? (source.viewMode as ViewMode)
      : DEFAULT_VIEW_MODE,
    thumbScale:
      typeof source.thumbScale === 'number' ? clampThumbScale(source.thumbScale) : DEFAULT_THUMB_SCALE,
    railWidth:
      typeof source.railWidth === 'number' ? clampRailWidth(source.railWidth) : DEFAULT_RAIL_WIDTH,
    locale: LOCALES.includes(source.locale as Locale) ? (source.locale as Locale) : DEFAULT_LOCALE,
    shortcuts,
  }
}
