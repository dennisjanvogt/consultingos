import { create } from 'zustand'

interface PinballStore {
  showNewGameModal: boolean
  setShowNewGameModal: (show: boolean) => void
}

export const usePinballStore = create<PinballStore>((set) => ({
  showNewGameModal: false,
  setShowNewGameModal: (show) => set({ showNewGameModal: show }),
}))

// Highscore persistence
const HIGHSCORE_KEY = 'pinball-highscores'

export interface PinballHighscore {
  score: number
  date: string
}

export function getPinballHighscores(): PinballHighscore[] {
  try {
    const data = localStorage.getItem(HIGHSCORE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function savePinballHighscore(score: number): void {
  const highscores = getPinballHighscores()
  highscores.push({
    score,
    date: new Date().toISOString(),
  })
  highscores.sort((a, b) => b.score - a.score)
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highscores.slice(0, 10)))
}

export function getPinballBestScore(): number {
  const highscores = getPinballHighscores()
  return highscores.length > 0 ? highscores[0].score : 0
}
