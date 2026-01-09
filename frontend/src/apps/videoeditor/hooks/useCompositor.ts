import { useRef, useCallback, useEffect } from 'react'
import type { Track, Clip, MediaAsset } from '../types'

interface CompositorOptions {
  width: number
  height: number
  tracks: Track[]
  currentTime: number
  mediaAssets: MediaAsset[]
  mediaUrls: Map<string, string>
  isPlaying: boolean
}

interface CompositorResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  renderFrame: () => void
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

export function useCompositor(options: CompositorOptions): CompositorResult {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastRenderTimeRef = useRef<number>(0)

  const { width, height, tracks, currentTime, mediaAssets, mediaUrls, isPlaying } = options

  // Get clips visible at current time, sorted by track order (bottom to top)
  const getVisibleClips = useCallback((): { clip: Clip; track: Track; asset: MediaAsset | undefined }[] => {
    const visibleClips: { clip: Clip; track: Track; asset: MediaAsset | undefined }[] = []

    // Sort tracks by order (lower order = rendered first = bottom layer)
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

  // Apply clip transform to canvas context
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

  // Apply effects to canvas context
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
      if (!asset) continue

      const url = mediaUrls.get(clip.sourceId)
      if (!url) continue

      ctx.save()
      ctx.globalAlpha = clip.opacity
      applyEffects(ctx, clip)

      try {
        if (clip.type === 'video' && asset.type === 'video') {
          const video = getOrCreateVideo(clip.sourceId, url)

          // Calculate video time based on clip position
          const clipLocalTime = (currentTime - clip.startTime) / 1000
          const videoTime = (clip.sourceStartTime / 1000) + clipLocalTime

          // Seek video if needed
          if (Math.abs(video.currentTime - videoTime) > 0.1) {
            video.currentTime = videoTime
          }

          // Wait for video to be ready
          if (video.readyState >= 2) {
            const videoWidth = video.videoWidth || width
            const videoHeight = video.videoHeight || height

            // Calculate aspect-fit dimensions
            const scale = Math.min(width / videoWidth, height / videoHeight)
            const drawWidth = videoWidth * scale
            const drawHeight = videoHeight * scale

            applyTransform(ctx, clip, drawWidth, drawHeight)
            ctx.drawImage(video, 0, 0, drawWidth, drawHeight)
          }
        } else if (clip.type === 'image' && asset.type === 'image') {
          try {
            const img = await getOrCreateImage(clip.sourceId, url)

            // Calculate aspect-fit dimensions
            const scale = Math.min(width / img.width, height / img.height)
            const drawWidth = img.width * scale
            const drawHeight = img.height * scale

            applyTransform(ctx, clip, drawWidth, drawHeight)
            ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
          } catch (e) {
            // Image not loaded yet
          }
        } else if (clip.type === 'text') {
          // Render text clip
          const textContent = clip.textContent || clip.name
          const fontSize = clip.fontSize || 48
          const fontFamily = clip.fontFamily || 'Arial'
          const textColor = clip.textColor || '#ffffff'
          const textAlign = clip.textAlign || 'center'

          ctx.font = `${fontSize}px ${fontFamily}`
          ctx.fillStyle = textColor
          ctx.textAlign = textAlign as CanvasTextAlign
          ctx.textBaseline = 'middle'

          const textWidth = ctx.measureText(textContent).width
          const textHeight = fontSize

          applyTransform(ctx, clip, textWidth, textHeight)

          // Draw text shadow if specified
          if (clip.textShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.5)'
            ctx.shadowBlur = 4
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2
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

  // Animation loop for playback
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
      // Render single frame when paused
      renderFrame()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, renderFrame])

  // Re-render when currentTime changes while paused
  useEffect(() => {
    if (!isPlaying && Math.abs(currentTime - lastRenderTimeRef.current) > 10) {
      renderFrame()
    }
  }, [currentTime, isPlaying, renderFrame])

  return {
    canvasRef,
    renderFrame,
  }
}

// Cleanup function to clear caches
export function clearCompositorCache() {
  videoCache.forEach(video => {
    video.pause()
    video.src = ''
  })
  videoCache.clear()
  imageCache.clear()
}
