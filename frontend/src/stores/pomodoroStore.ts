import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PomodoroState {
  isActive: boolean
  minutes: number
  endTime: number | null
  isBreak: boolean

  startPomodoro: (minutes: number, breakMinutes: number) => void
  stopPomodoro: () => void
  setBreak: (isBreak: boolean, breakMinutes: number) => void
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set) => ({
      isActive: false,
      minutes: 25,
      endTime: null,
      isBreak: false,

      startPomodoro: (minutes: number, _breakMinutes: number) => {
        set({
          isActive: true,
          minutes,
          endTime: Date.now() + minutes * 60 * 1000,
          isBreak: false,
        })
      },

      stopPomodoro: () => {
        set({
          isActive: false,
          endTime: null,
          isBreak: false,
        })
      },

      setBreak: (isBreak: boolean, breakMinutes: number) => {
        if (isBreak) {
          set({
            isBreak: true,
            endTime: Date.now() + breakMinutes * 60 * 1000,
          })
        } else {
          set({ isBreak: false })
        }
      },
    }),
    {
      name: 'pomodoro-storage',
      partialize: (state) => ({
        isActive: state.isActive,
        minutes: state.minutes,
        endTime: state.endTime,
        isBreak: state.isBreak,
      }),
    }
  )
)
