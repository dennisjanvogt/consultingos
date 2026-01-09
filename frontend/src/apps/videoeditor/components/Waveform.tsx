import { useEffect, useRef, useState, memo } from 'react'

interface WaveformProps {
  audioUrl: string
  width: number
  height: number
  color?: string
  backgroundColor?: string
}

// Cache for waveform data
const waveformCache = new Map<string, Float32Array>()

async function generateWaveformData(audioUrl: string, samples: number = 100): Promise<Float32Array> {
  // Check cache first
  const cacheKey = `${audioUrl}-${samples}`
  if (waveformCache.has(cacheKey)) {
    return waveformCache.get(cacheKey)!
  }

  try {
    const response = await fetch(audioUrl)
    const arrayBuffer = await response.arrayBuffer()

    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Get channel data (use first channel for simplicity)
    const channelData = audioBuffer.getChannelData(0)
    const blockSize = Math.floor(channelData.length / samples)

    const waveformData = new Float32Array(samples)

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      let sum = 0

      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] || 0)
      }

      waveformData[i] = sum / blockSize
    }

    // Normalize waveform data
    const max = Math.max(...waveformData)
    if (max > 0) {
      for (let i = 0; i < samples; i++) {
        waveformData[i] = waveformData[i] / max
      }
    }

    // Cache the result
    waveformCache.set(cacheKey, waveformData)

    audioContext.close()
    return waveformData
  } catch (error) {
    console.error('Failed to generate waveform:', error)
    // Return empty waveform on error
    return new Float32Array(samples).fill(0.5)
  }
}

export const Waveform = memo(function Waveform({
  audioUrl,
  width,
  height,
  color = '#22c55e',
  backgroundColor = 'transparent',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Generate waveform data
  useEffect(() => {
    if (!audioUrl) return

    setIsLoading(true)
    const samples = Math.max(50, Math.min(200, Math.floor(width / 2)))

    generateWaveformData(audioUrl, samples)
      .then(data => {
        setWaveformData(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [audioUrl, width])

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveformData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Draw waveform
    const barWidth = width / waveformData.length
    const midY = height / 2

    ctx.fillStyle = color

    for (let i = 0; i < waveformData.length; i++) {
      const barHeight = waveformData[i] * height * 0.8
      const x = i * barWidth
      const y = midY - barHeight / 2

      // Draw bar with slight gap
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    }
  }, [waveformData, width, height, color, backgroundColor])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
})

// Inline waveform for clip display (simpler, less detailed)
export const InlineWaveform = memo(function InlineWaveform({
  audioUrl,
  className = '',
}: {
  audioUrl: string
  className?: string
}) {
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null)

  useEffect(() => {
    if (!audioUrl) return

    generateWaveformData(audioUrl, 30)
      .then(setWaveformData)
      .catch(() => {})
  }, [audioUrl])

  if (!waveformData) {
    return <div className={`${className} bg-green-600/30`} />
  }

  return (
    <div className={`${className} flex items-center gap-px`}>
      {Array.from(waveformData).map((value, i) => (
        <div
          key={i}
          className="flex-1 bg-green-400/70 rounded-sm min-w-[1px]"
          style={{
            height: `${Math.max(10, value * 100)}%`,
          }}
        />
      ))}
    </div>
  )
})

// Clear waveform cache (useful when media is deleted)
export function clearWaveformCache(audioUrl?: string) {
  if (audioUrl) {
    // Clear specific URL entries
    for (const key of waveformCache.keys()) {
      if (key.startsWith(audioUrl)) {
        waveformCache.delete(key)
      }
    }
  } else {
    waveformCache.clear()
  }
}
