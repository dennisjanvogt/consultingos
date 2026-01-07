import { create } from 'zustand'

interface SnakeStore {
  showNewGameModal: boolean
  setShowNewGameModal: (show: boolean) => void
}

export const useSnakeStore = create<SnakeStore>((set) => ({
  showNewGameModal: false,
  setShowNewGameModal: (show) => set({ showNewGameModal: show }),
}))

// Highscore persistence
const HIGHSCORE_KEY = 'snake-highscores'

export interface SnakeHighscore {
  score: number
  date: string
  length: number
}

export function getSnakeHighscores(): SnakeHighscore[] {
  try {
    const data = localStorage.getItem(HIGHSCORE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveSnakeHighscore(score: number, length: number): void {
  const highscores = getSnakeHighscores()
  highscores.push({
    score,
    date: new Date().toISOString(),
    length,
  })
  // Keep top 10
  highscores.sort((a, b) => b.score - a.score)
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highscores.slice(0, 10)))
}

export function getSnakeBestScore(): number {
  const highscores = getSnakeHighscores()
  return highscores.length > 0 ? highscores[0].score : 0
}
