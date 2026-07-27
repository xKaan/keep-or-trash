import { describe, it, expect } from 'vitest'
import { formatPhotoSize } from './format'

describe('formatPhotoSize', () => {
  it('formats sizes at or above 1 MB with a comma decimal', () => {
    expect(formatPhotoSize(2_400_000)).toEqual({ unit: 'mb', value: '2,4' })
    expect(formatPhotoSize(1_000_000)).toEqual({ unit: 'mb', value: '1,0' })
  })

  it('formats sizes under 1 MB in kilobytes, rounded', () => {
    expect(formatPhotoSize(500_000)).toEqual({ unit: 'kb', value: '500' })
    expect(formatPhotoSize(1_400)).toEqual({ unit: 'kb', value: '1' })
  })

  it('floors at 1 KB instead of showing 0', () => {
    expect(formatPhotoSize(10)).toEqual({ unit: 'kb', value: '1' })
  })
})
