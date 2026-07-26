export interface PhotoInfo {
  name: string
  path: string
  size: number
}

export type Decision = 'keep' | 'trash'

export interface HistoryEntry {
  filename: string
  action: Decision
}
