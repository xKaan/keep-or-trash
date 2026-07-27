import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUTS,
  DEFAULT_THUMB_SCALE,
  DEFAULT_RAIL_WIDTH,
  DEFAULT_VIEW_MODE,
  RAIL_WIDTH_MAX,
  RAIL_WIDTH_MIN,
  THUMB_SCALE_MAX,
  THUMB_SCALE_MIN,
  assignShortcut,
  clampRailWidth,
  clampThumbScale,
  formatKeyLabel,
  isModifierKey,
  isReservedKey,
  normalizeKey,
  parseSettings,
  parseTheme,
  resolveTheme,
} from './settings'

describe('normalizeKey', () => {
  it('lowercases single characters', () => {
    expect(normalizeKey('K')).toBe('k')
    expect(normalizeKey('k')).toBe('k')
  })

  it('leaves named keys untouched', () => {
    expect(normalizeKey('ArrowLeft')).toBe('ArrowLeft')
    expect(normalizeKey('Backspace')).toBe('Backspace')
  })
})

describe('isReservedKey', () => {
  it('reserves navigation and zoom keys', () => {
    expect(isReservedKey('Escape')).toBe(true)
    expect(isReservedKey('Tab')).toBe(true)
    expect(isReservedKey('+')).toBe(true)
    expect(isReservedKey('=')).toBe(true)
    expect(isReservedKey('-')).toBe(true)
  })

  it('allows ordinary keys', () => {
    expect(isReservedKey('G')).toBe(false)
    expect(isReservedKey('Delete')).toBe(false)
    expect(isReservedKey('r')).toBe(false)
  })
})

describe('isModifierKey', () => {
  it('detects bare modifiers', () => {
    expect(isModifierKey('Shift')).toBe(true)
    expect(isModifierKey('Control')).toBe(true)
    expect(isModifierKey('Alt')).toBe(true)
    expect(isModifierKey('Meta')).toBe(true)
    expect(isModifierKey('a')).toBe(false)
  })
})

describe('formatKeyLabel', () => {
  const keyLabels = {
    ArrowLeft: '←',
    ArrowRight: '→',
    Backspace: '⌫',
    Delete: 'Del',
    ' ': 'Space',
  }
  const unassigned = 'Unassigned'

  it('renders arrows and named keys', () => {
    expect(formatKeyLabel('ArrowLeft', keyLabels, unassigned)).toBe('←')
    expect(formatKeyLabel('ArrowRight', keyLabels, unassigned)).toBe('→')
    expect(formatKeyLabel('Backspace', keyLabels, unassigned)).toBe('⌫')
    expect(formatKeyLabel(' ', keyLabels, unassigned)).toBe('Space')
    expect(formatKeyLabel('Delete', keyLabels, unassigned)).toBe('Del')
  })

  it('uppercases letters and marks unassigned actions', () => {
    expect(formatKeyLabel('k', keyLabels, unassigned)).toBe('K')
    expect(formatKeyLabel(null, keyLabels, unassigned)).toBe('Unassigned')
  })
})

describe('DEFAULT_SHORTCUTS', () => {
  it('binds rotate to r by default', () => {
    expect(DEFAULT_SHORTCUTS.rotate).toBe('r')
  })
})

describe('assignShortcut', () => {
  it('assigns a free key without evicting anything', () => {
    const result = assignShortcut(DEFAULT_SHORTCUTS, 'keep', 'G')
    expect(result.shortcuts.keep).toBe('g')
    expect(result.evicted).toBeNull()
    expect(result.shortcuts.next).toBe('ArrowRight')
  })

  it('evicts the action that already owned the key', () => {
    const result = assignShortcut(DEFAULT_SHORTCUTS, 'keep', 'ArrowRight')
    expect(result.shortcuts.keep).toBe('ArrowRight')
    expect(result.shortcuts.next).toBeNull()
    expect(result.evicted).toBe('next')
  })

  it('is a no-op when reassigning a key to its own action', () => {
    const result = assignShortcut(DEFAULT_SHORTCUTS, 'keep', 'K')
    expect(result.shortcuts).toEqual(DEFAULT_SHORTCUTS)
    expect(result.evicted).toBeNull()
  })

  it('does not mutate the input', () => {
    assignShortcut(DEFAULT_SHORTCUTS, 'keep', 'ArrowRight')
    expect(DEFAULT_SHORTCUTS.next).toBe('ArrowRight')
  })
})

describe('resolveTheme', () => {
  it('passes explicit themes through', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('follows the OS preference in system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('parseTheme', () => {
  it('accepts the three valid values', () => {
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('system')).toBe('system')
  })

  it('falls back to dark on anything else', () => {
    expect(parseTheme(null)).toBe('dark')
    expect(parseTheme('purple')).toBe('dark')
  })
})

describe('clampThumbScale', () => {
  it('passes through values within range', () => {
    expect(clampThumbScale(200)).toBe(200)
  })

  it('clamps below the minimum', () => {
    expect(clampThumbScale(10)).toBe(THUMB_SCALE_MIN)
  })

  it('clamps above the maximum', () => {
    expect(clampThumbScale(9999)).toBe(THUMB_SCALE_MAX)
  })

  it('falls back to the default for non-finite input', () => {
    expect(clampThumbScale(NaN)).toBe(DEFAULT_THUMB_SCALE)
  })
})

describe('clampRailWidth', () => {
  it('passes through values within range', () => {
    expect(clampRailWidth(300)).toBe(300)
  })

  it('clamps below the minimum', () => {
    expect(clampRailWidth(10)).toBe(RAIL_WIDTH_MIN)
  })

  it('clamps above the maximum', () => {
    expect(clampRailWidth(9999)).toBe(RAIL_WIDTH_MAX)
  })

  it('falls back to the default for non-finite input', () => {
    expect(clampRailWidth(NaN)).toBe(DEFAULT_RAIL_WIDTH)
  })
})

describe('parseSettings', () => {
  it('returns the defaults for null and for corrupt JSON', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{ not json')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('"a string"')).toEqual(DEFAULT_SETTINGS)
  })

  it('fills each missing field independently', () => {
    const parsed = parseSettings(JSON.stringify({ viewMode: 'list' }))
    expect(parsed.viewMode).toBe('list')
    expect(parsed.shortcuts).toEqual(DEFAULT_SHORTCUTS)
  })

  it('rejects an invalid view mode', () => {
    const parsed = parseSettings(JSON.stringify({ viewMode: 'enormous' }))
    expect(parsed.viewMode).toBe(DEFAULT_VIEW_MODE)
  })

  it('clamps an out-of-range stored thumbScale', () => {
    const parsed = parseSettings(JSON.stringify({ thumbScale: 999999 }))
    expect(parsed.thumbScale).toBe(THUMB_SCALE_MAX)
  })

  it('defaults thumbScale and railWidth when missing or not a number', () => {
    expect(parseSettings(JSON.stringify({}))).toMatchObject({
      thumbScale: DEFAULT_THUMB_SCALE,
      railWidth: DEFAULT_RAIL_WIDTH,
    })
    expect(parseSettings(JSON.stringify({ thumbScale: 'big' })).thumbScale).toBe(DEFAULT_THUMB_SCALE)
  })

  it('keeps stored shortcuts, normalizes them, and honours null', () => {
    const parsed = parseSettings(
      JSON.stringify({ shortcuts: { keep: 'G', next: null, nope: 'x' } }),
    )
    expect(parsed.shortcuts.keep).toBe('g')
    expect(parsed.shortcuts.next).toBeNull()
    expect(parsed.shortcuts.prev).toBe('ArrowLeft')
    expect(Object.keys(parsed.shortcuts).sort()).toEqual([
      'keep',
      'next',
      'prev',
      'rotate',
      'trash',
      'undo',
    ])
  })

  it('ignores a non-object shortcuts field', () => {
    const parsed = parseSettings(JSON.stringify({ shortcuts: 'nope' }))
    expect(parsed.shortcuts).toEqual(DEFAULT_SHORTCUTS)
  })
})

describe('parseSettings locale', () => {
  it('defaults to en when missing or invalid', () => {
    expect(parseSettings(null).locale).toBe('en')
    expect(parseSettings(JSON.stringify({ locale: 'de' })).locale).toBe('en')
  })

  it('keeps a valid stored locale', () => {
    expect(parseSettings(JSON.stringify({ locale: 'fr' })).locale).toBe('fr')
  })
})
