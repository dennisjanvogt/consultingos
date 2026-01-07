import { create } from 'zustand'

interface TetrisStore {
  showNewGameModal: boolean
  setShowNewGameModal: (show: boolean) => void
}

export const useTetrisStore = create<TetrisStore>((set) => ({
  showNewGameModal: false,
  setShowNewGameModal: (show) => set({ showNewGameModal: show }),
}))

// Highscore persistence
const HIGHSCORE_KEY = 'tetris-highscores'

export interface TetrisHighscore {
  score: number
  date: string
  level: number
  lines: number
}

export function getTetrisHighscores(): TetrisHighscore[] {
  try {
    const data = localStorage.getItem(HIGHSCORE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveTetrisHighscore(score: number, level: number, lines: number): void {
  const highscores = getTetrisHighscores()
  highscores.push({
    score,
    date: new Date().toISOString(),
    level,
    lines,
  })
  highscores.sort((a, b) => b.score - a.score)
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highscores.slice(0, 10)))
}

export function getTetrisBestScore(): number {
  const highscores = getTetrisHighscores()
  return highscores.length > 0 ? highscores[0].score : 0
}
