import { create } from 'zustand'

interface Game2048Store {
  showNewGameModal: boolean
  setShowNewGameModal: (show: boolean) => void
}

export const useGame2048Store = create<Game2048Store>((set) => ({
  showNewGameModal: false,
  setShowNewGameModal: (show) => set({ showNewGameModal: show }),
}))

// Highscore persistence
const HIGHSCORE_KEY = '2048-highscores'

export interface Highscore {
  score: number
  date: string
  won: boolean
}

export function getHighscores(): Highscore[] {
  try {
    const data = localStorage.getItem(HIGHSCORE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveHighscore(score: number, won: boolean): void {
  const highscores = getHighscores()
  highscores.push({
    score,
    date: new Date().toISOString(),
    won,
  })
  // Keep top 10
  highscores.sort((a, b) => b.score - a.score)
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highscores.slice(0, 10)))
}

export function getBestScore(): number {
  const highscores = getHighscores()
  return highscores.length > 0 ? highscores[0].score : 0
}
