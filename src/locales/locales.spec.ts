import { describe, it, expect } from 'vitest'
import en from './en.json'
import fr from './fr.json'

function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    keyPaths(value, prefix ? `${prefix}.${key}` : key),
  )
}

describe('locale files', () => {
  it('en and fr expose the exact same set of keys', () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(fr).sort())
  })
})
