import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useDocumentsStore } from './documentsStore'
import html2canvas from 'html2canvas'

type RecordingSource = 'tab' | 'screen' | 'window'
type RecordingQuality = '720p' | '1080p' | 'original'

interface RecordingState {
  // Persisted settings
  source: RecordingSource
  quality: RecordingQuality
  audioEnabled: boolean
  lastRecordingId: number | null
  lastRecordingName: string | null

  // Runtime state (not persisted)
  isRecording: boolean
  isPaused: boolean
  startTime: number | null
  isUploading: boolean
  targetWindowId: string | null

  // Actions
  setSource: (source: RecordingSource) => void
  setQuality: (quality: RecordingQuality) => void
  setAudioEnabled: (enabled: boolean) => void
  startRecording: () => Promise<void>
  startWindowRecording: (windowId: string) => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<void>
}

// Store MediaRecorder and chunks outside of Zustand (can't be serialized)
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let mediaStream: MediaStream | null = null
let audioStream: MediaStream | null = null

// For window recording
let windowRecordingCanvas: HTMLCanvasElement | null = null
let windowRecordingInterval: number | null = null
let windowRecordingFrameId: number | null = null

// Quality settings (bitrate in bps)
const qualitySettings: Record<RecordingQuality, number> = {
  '720p': 1500000,   // 1.5 Mbps
  '1080p': 3000000,  // 3 Mbps
  'original': 5000000 // 5 Mbps
}

// Frame rate settings
const frameRates: Record<RecordingQuality, number> = {
  '720p': 15,
  '1080p': 24,
  'original': 30,
}

export const useRecordingStore = create<RecordingState>()(
  persist(
    (set, get) => ({
      // Persisted settings
      source: 'tab',
      quality: '1080p',
      audioEnabled: false,
      lastRecordingId: null,
      lastRecordingName: null,

      // Runtime state
      isRecording: false,
      isPaused: false,
      startTime: null,
      isUploading: false,
      targetWindowId: null,

      setSource: (source) => set({ source }),
      setQuality: (quality) => set({ quality }),
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),

      startRecording: async () => {
        const { source, quality, audioEnabled } = get()

        // If source is 'window', use the active window
        if (source === 'window') {
          // Get active window from windowStore
          const { windows } = await import('./windowStore').then(m => m.useWindowStore.getState())
          const activeWindow = windows.find(w => !w.isMinimized)
          if (activeWindow) {
            return get().startWindowRecording(activeWindow.id)
          }
          return
        }

        try {
          // Request screen/tab capture
          const displayMediaOptions: DisplayMediaStreamOptions = {
            video: {
              displaySurface: source === 'tab' ? 'browser' : 'monitor',
            } as MediaTrackConstraints,
            audio: false, // We'll handle audio separately if needed
          }

          mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)

          // If audio enabled, get microphone stream and merge
          if (audioEnabled) {
            try {
              audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
              // Merge audio track into media stream
              const audioTrack = audioStream.getAudioTracks()[0]
              if (audioTrack) {
                mediaStream.addTrack(audioTrack)
              }
            } catch (err) {
              console.warn('Could not get microphone access:', err)
            }
          }

          // Create MediaRecorder
          const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : 'video/webm'

          mediaRecorder = new MediaRecorder(mediaStream, {
            mimeType,
            videoBitsPerSecond: qualitySettings[quality],
          })

          recordedChunks = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunks.push(event.data)
            }
          }

          // Handle stream ending (user clicks "Stop sharing")
          mediaStream.getVideoTracks()[0].onended = () => {
            get().stopRecording()
          }

          mediaRecorder.start(1000) // Collect data every second

          set({
            isRecording: true,
            isPaused: false,
            startTime: Date.now(),
            targetWindowId: null,
          })
        } catch (err) {
          console.error('Failed to start recording:', err)
          // Cleanup on error
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop())
            mediaStream = null
          }
          if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop())
            audioStream = null
          }
        }
      },

      startWindowRecording: async (windowId: string) => {
        const { quality, audioEnabled } = get()

        try {
          // Find the window element
          const windowElement = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement
          if (!windowElement) {
            console.error('Window element not found:', windowId)
            return
          }

          // Create canvas for capturing
          windowRecordingCanvas = document.createElement('canvas')
          const ctx = windowRecordingCanvas.getContext('2d')
          if (!ctx) {
            console.error('Could not get canvas context')
            return
          }

          // Get initial dimensions from the window element
          const rect = windowElement.getBoundingClientRect()
          windowRecordingCanvas.width = rect.width
          windowRecordingCanvas.height = rect.height

          // Create a stream from the canvas
          const canvasStream = windowRecordingCanvas.captureStream(frameRates[quality])

          // If audio enabled, get microphone stream and merge
          if (audioEnabled) {
            try {
              audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
              const audioTrack = audioStream.getAudioTracks()[0]
              if (audioTrack) {
                canvasStream.addTrack(audioTrack)
              }
            } catch (err) {
              console.warn('Could not get microphone access:', err)
            }
          }

          // Create MediaRecorder
          const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : 'video/webm'

          mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType,
            videoBitsPerSecond: qualitySettings[quality],
          })

          recordedChunks = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunks.push(event.data)
            }
          }

          mediaRecorder.start(1000)

          // Start capturing frames
          const captureFrame = async () => {
            if (!get().isRecording || get().isPaused) {
              windowRecordingFrameId = requestAnimationFrame(captureFrame)
              return
            }

            const element = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement
            if (!element || !windowRecordingCanvas) {
              windowRecordingFrameId = requestAnimationFrame(captureFrame)
              return
            }

            try {
              const canvas = await html2canvas(element, {
                scale: quality === '720p' ? 0.75 : quality === '1080p' ? 1 : 1.5,
                logging: false,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
              })

              // Update canvas dimensions if needed
              if (windowRecordingCanvas.width !== canvas.width || windowRecordingCanvas.height !== canvas.height) {
                windowRecordingCanvas.width = canvas.width
                windowRecordingCanvas.height = canvas.height
              }

              // Draw to our recording canvas
              ctx.clearRect(0, 0, windowRecordingCanvas.width, windowRecordingCanvas.height)
              ctx.drawImage(canvas, 0, 0)
            } catch (err) {
              console.warn('Frame capture error:', err)
            }

            // Schedule next frame based on quality/fps
            const frameDelay = 1000 / frameRates[quality]
            windowRecordingInterval = window.setTimeout(() => {
              windowRecordingFrameId = requestAnimationFrame(captureFrame)
            }, frameDelay)
          }

          windowRecordingFrameId = requestAnimationFrame(captureFrame)

          set({
            isRecording: true,
            isPaused: false,
            startTime: Date.now(),
            targetWindowId: windowId,
          })
        } catch (err) {
          console.error('Failed to start window recording:', err)
          if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop())
            audioStream = null
          }
        }
      },

      pauseRecording: () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.pause()
          set({ isPaused: true })
        }
      },

      resumeRecording: () => {
        if (mediaRecorder && mediaRecorder.state === 'paused') {
          mediaRecorder.resume()
          set({ isPaused: false })
        }
      },

      stopRecording: async () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          return
        }

        set({ isUploading: true })

        // Stop the frame capture loop for window recording
        if (windowRecordingInterval) {
          clearTimeout(windowRecordingInterval)
          windowRecordingInterval = null
        }
        if (windowRecordingFrameId) {
          cancelAnimationFrame(windowRecordingFrameId)
          windowRecordingFrameId = null
        }

        // Return a promise that resolves when recording is stopped and uploaded
        return new Promise<void>((resolve) => {
          mediaRecorder!.onstop = async () => {
            // Create blob from recorded chunks
            const blob = new Blob(recordedChunks, { type: 'video/webm' })

            // Generate filename with timestamp
            const now = new Date()
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
            const { targetWindowId } = get()
            const prefix = targetWindowId ? 'app_recording' : 'screen_recording'
            const filename = `${prefix}_${timestamp}.webm`

            // Create File object for upload
            const file = new File([blob], filename, { type: 'video/webm' })

            // Upload to Documents
            try {
              const doc = await useDocumentsStore.getState().uploadDocument(file, null, targetWindowId ? 'App Recording' : 'Screen Recording')
              if (doc) {
                set({
                  lastRecordingId: doc.id,
                  lastRecordingName: doc.name,
                })
              }
            } catch (err) {
              console.error('Failed to upload recording:', err)
              // Fallback: download locally
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = filename
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }

            // Cleanup
            if (mediaStream) {
              mediaStream.getTracks().forEach(track => track.stop())
              mediaStream = null
            }
            if (audioStream) {
              audioStream.getTracks().forEach(track => track.stop())
              audioStream = null
            }
            mediaRecorder = null
            recordedChunks = []
            windowRecordingCanvas = null

            set({
              isRecording: false,
              isPaused: false,
              startTime: null,
              isUploading: false,
              targetWindowId: null,
            })

            resolve()
          }

          mediaRecorder!.stop()
        })
      },
    }),
    {
      name: 'recording-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        source: state.source,
        quality: state.quality,
        audioEnabled: state.audioEnabled,
        lastRecordingId: state.lastRecordingId,
        lastRecordingName: state.lastRecordingName,
      }),
    }
  )
)
