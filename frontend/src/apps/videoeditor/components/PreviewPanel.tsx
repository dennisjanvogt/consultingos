import { useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Maximize2, Volume2, VolumeX, Film } from 'lucide-react'
import type { Track, Clip, MediaAsset } from '../types'

interface PreviewPanelProps {
  tracks: Track[]
  currentTime: number
  projectDuration: number
  isPlaying: boolean
  resolution: { width: number; height: number }
  mediaAssets: MediaAsset[]
  mediaUrls: Map<string, string>
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
}

// Format time in mm:ss.ms
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const milliseconds = Math.floor((ms % 1000) / 10)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
}

// Video element cache for performance
const videoCache = new Map<string, HTMLVideoElement>()

function getOrCreateVideo(sourceId: string, url: string): HTMLVideoElement {
  if (videoCache.has(sourceId)) {
    return videoCache.get(sourceId)!
  }

  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  videoCache.set(sourceId, video)

  return video
}

// Image cache
const imageCache = new Map<string, HTMLImageElement>()

function getOrCreateImage(sourceId: string, url: string): Promise<HTMLImageElement> {
  if (imageCache.has(sourceId)) {
    return Promise.resolve(imageCache.get(sourceId)!)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(sourceId, img)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

export function PreviewPanel({
  tracks,
  currentTime,
  projectDuration,
  isPlaying,
  resolution,
  mediaAssets,
  mediaUrls,
  onPlay,
  onPause,
  onStop,
  onSeek,
}: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastRenderTimeRef = useRef<number>(-1)

  const { width, height } = resolution

  // Get clips visible at current time, sorted by track order
  const getVisibleClips = useCallback((): { clip: Clip; track: Track; asset: MediaAsset | undefined }[] => {
    const visibleClips: { clip: Clip; track: Track; asset: MediaAsset | undefined }[] = []

    const sortedTracks = [...tracks].sort((a, b) => a.order - b.order)

    for (const track of sortedTracks) {
      if (!track.visible) continue

      for (const clip of track.clips) {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          const asset = mediaAssets.find(a => a.id === clip.sourceId)
          visibleClips.push({ clip, track, asset })
        }
      }
    }

    return visibleClips
  }, [tracks, currentTime, mediaAssets])

  // Apply clip transform
  const applyTransform = useCallback((
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    clipWidth: number,
    clipHeight: number
  ) => {
    const centerX = width / 2 + clip.transform.x
    const centerY = height / 2 + clip.transform.y

    ctx.translate(centerX, centerY)
    ctx.rotate((clip.transform.rotation * Math.PI) / 180)
    ctx.scale(clip.transform.scaleX, clip.transform.scaleY)
    ctx.translate(-clipWidth * clip.transform.anchorX, -clipHeight * clip.transform.anchorY)
  }, [width, height])

  // Apply effects
  const applyEffects = useCallback((ctx: CanvasRenderingContext2D, clip: Clip) => {
    const filters: string[] = []

    for (const effect of clip.effects) {
      if (!effect.enabled) continue

      switch (effect.type) {
        case 'brightness':
          filters.push(`brightness(${effect.value})`)
          break
        case 'contrast':
          filters.push(`contrast(${effect.value})`)
          break
        case 'saturation':
          filters.push(`saturate(${effect.value})`)
          break
        case 'blur':
          filters.push(`blur(${effect.value}px)`)
          break
        case 'grayscale':
          filters.push(`grayscale(${effect.value})`)
          break
        case 'sepia':
          filters.push(`sepia(${effect.value})`)
          break
        case 'hue-rotate':
          filters.push(`hue-rotate(${effect.value}deg)`)
          break
        case 'invert':
          filters.push(`invert(${effect.value})`)
          break
      }
    }

    if (filters.length > 0) {
      ctx.filter = filters.join(' ')
    }
  }, [])

  // Render a single frame
  const renderFrame = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    const visibleClips = getVisibleClips()

    for (const { clip, track, asset } of visibleClips) {
      if (!asset && clip.type !== 'text') continue

      const url = asset ? mediaUrls.get(clip.sourceId) : undefined

      ctx.save()
      ctx.globalAlpha = clip.opacity
      applyEffects(ctx, clip)

      try {
        if (clip.type === 'video' && asset?.type === 'video' && url) {
          const video = getOrCreateVideo(clip.sourceId, url)

          const clipLocalTime = (currentTime - clip.startTime) / 1000
          const videoTime = (clip.sourceStartTime / 1000) + clipLocalTime

          if (Math.abs(video.currentTime - videoTime) > 0.1) {
            video.currentTime = videoTime
          }

          if (video.readyState >= 2) {
            const videoWidth = video.videoWidth || width
            const videoHeight = video.videoHeight || height

            const scale = Math.min(width / videoWidth, height / videoHeight)
            const drawWidth = videoWidth * scale
            const drawHeight = videoHeight * scale

            applyTransform(ctx, clip, drawWidth, drawHeight)
            ctx.drawImage(video, 0, 0, drawWidth, drawHeight)
          }
        } else if (clip.type === 'image' && asset?.type === 'image' && url) {
          try {
            const img = await getOrCreateImage(clip.sourceId, url)

            const scale = Math.min(width / img.width, height / img.height)
            const drawWidth = img.width * scale
            const drawHeight = img.height * scale

            applyTransform(ctx, clip, drawWidth, drawHeight)
            ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
          } catch {
            // Image not loaded yet
          }
        } else if (clip.type === 'text') {
          const textContent = clip.textContent || clip.name
          const fontSize = clip.fontSize || 48
          const fontFamily = clip.fontFamily || 'Arial'
          const textColor = clip.textColor || '#ffffff'
          const textAlign = clip.textAlign || 'center'
          const fontWeight = clip.fontWeight || 400

          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
          ctx.fillStyle = textColor
          ctx.textAlign = textAlign as CanvasTextAlign
          ctx.textBaseline = 'middle'

          const textWidth = ctx.measureText(textContent).width
          const textHeight = fontSize

          applyTransform(ctx, clip, textWidth, textHeight)

          // Background
          if (clip.backgroundColor) {
            ctx.fillStyle = clip.backgroundColor
            ctx.fillRect(-10, -10, textWidth + 20, textHeight + 20)
            ctx.fillStyle = textColor
          }

          // Shadow
          if (clip.textShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.7)'
            ctx.shadowBlur = 6
            ctx.shadowOffsetX = 3
            ctx.shadowOffsetY = 3
          }

          ctx.fillText(textContent, textWidth / 2, textHeight / 2)
        }
      } catch (e) {
        console.error('Error rendering clip:', e)
      }

      ctx.restore()
    }

    lastRenderTimeRef.current = currentTime
  }, [width, height, getVisibleClips, currentTime, mediaUrls, applyTransform, applyEffects])

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        renderFrame()
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      renderFrame()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, renderFrame])

  // Re-render when time changes while paused
  useEffect(() => {
    if (!isPlaying && Math.abs(currentTime - lastRenderTimeRef.current) > 10) {
      renderFrame()
    }
  }, [currentTime, isPlaying, renderFrame])

  const hasContent = tracks.some(t => t.clips.length > 0)

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-black p-4 min-h-[200px]">
      <div className="relative w-full max-w-3xl aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
        {/* Canvas Preview */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Empty state overlay */}
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Film className="w-16 h-16 opacity-30 mx-auto mb-2" />
              <p className="text-sm">Medien auf Timeline ziehen</p>
            </div>
          </div>
        )}

        {/* Playback Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <button
              onClick={onStop}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Zum Anfang"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => isPlaying ? onPause() : onPlay()}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={() => onSeek(currentTime + 5000)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="5s vorwärts"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Time display */}
            <span className="text-sm font-mono ml-2">
              {formatTime(currentTime)} / {formatTime(projectDuration)}
            </span>

            {/* Progress bar */}
            <div
              className="flex-1 h-1 bg-white/20 rounded cursor-pointer mx-4"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                onSeek(percent * projectDuration)
              }}
            >
              <div
                className="h-full bg-violet-500 rounded"
                style={{ width: projectDuration > 0 ? `${(currentTime / projectDuration) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
