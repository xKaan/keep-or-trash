export interface FormattedSize {
  unit: 'mb' | 'kb'
  value: string
}

export function formatPhotoSize(bytes: number): FormattedSize {
  const megabytes = bytes / 1_000_000
  if (megabytes >= 1) {
    return { unit: 'mb', value: megabytes.toFixed(1).replace('.', ',') }
  }
  return { unit: 'kb', value: String(Math.max(1, Math.round(bytes / 1000))) }
}
