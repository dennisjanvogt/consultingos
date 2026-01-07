import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Download, SkipBack, SkipForward, FileVideo, Loader2 } from 'lucide-react'
import { useVideoViewerStore } from '@/stores/videoViewerStore'

const MEDIA_BASE_URL = 'http://localhost:8000'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function VideoViewerApp() {
  const { currentVideo } = useVideoViewerStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  // Reset state when video changes, use stored duration if available
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    // Use duration from API if available, otherwise 0
    setDuration(currentVideo?.duration ?? 0)
  }, [currentVideo?.id, currentVideo?.duration])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(10)
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, isMuted])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
  }, [duration])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement?.parentElement
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleDurationChange = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleCanPlay = () => {
    if (videoRef.current && isFinite(videoRef.current.duration) && duration === 0) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    videoRef.current.currentTime = percent * duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

  const handleDownload = () => {
    if (!currentVideo) return
    const videoUrl = currentVideo.file_url.startsWith('http')
      ? currentVideo.file_url
      : `${MEDIA_BASE_URL}${currentVideo.file_url}`
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = currentVideo.name
    link.click()
  }

  const handleDownloadMp4 = async () => {
    if (!currentVideo || isConverting) return
    setIsConverting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${currentVideo.id}/download-mp4`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Conversion failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const baseName = currentVideo.name.replace(/\.[^.]+$/, '')
      link.download = `${baseName}.mp4`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('MP4 conversion failed:', error)
    } finally {
      setIsConverting(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleVideoEnded = () => {
    setIsPlaying(false)
  }

  if (!currentVideo) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-900">
        Kein Video ausgewählt
      </div>
    )
  }

  const videoUrl = currentVideo.file_url.startsWith('http')
    ? currentVideo.file_url
    : `${MEDIA_BASE_URL}${currentVideo.file_url}`

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Video Container */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-w-full max-h-full"
          preload="auto"
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onCanPlay={handleCanPlay}
          onEnded={handleVideoEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* Play overlay on pause */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        {/* Progress Bar */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1.5 bg-gray-700 rounded-full cursor-pointer mb-3 group"
        >
          <div
            className="h-full bg-red-500 rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Skip Back */}
            <button
              onClick={() => skip(-10)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="-10 Sekunden"
            >
              <SkipBack className="w-4 h-4 text-gray-300" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Abspielen (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-gray-300" />
              ) : (
                <Play className="w-5 h-5 text-gray-300" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(10)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="+10 Sekunden"
            >
              <SkipForward className="w-4 h-4 text-gray-300" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                title={isMuted ? 'Ton an (M)' : 'Stumm (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-gray-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Time */}
            <span className="text-xs text-gray-400 ml-3 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Download Original */}
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Original herunterladen"
            >
              <Download className="w-4 h-4 text-gray-300" />
            </button>

            {/* Download as MP4 */}
            {currentVideo.file_type !== 'mp4' && (
              <button
                onClick={handleDownloadMp4}
                disabled={isConverting}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title="Als MP4 herunterladen"
              >
                {isConverting ? (
                  <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                ) : (
                  <FileVideo className="w-4 h-4 text-gray-300" />
                )}
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Vollbild (F)"
            >
              <Maximize className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
        <span className="truncate max-w-[300px]">{currentVideo.name}</span>
        <span>{currentVideo.file_type.toUpperCase()} • Space: Play/Pause • M: Mute • F: Fullscreen</span>
      </div>
    </div>
  )
}
