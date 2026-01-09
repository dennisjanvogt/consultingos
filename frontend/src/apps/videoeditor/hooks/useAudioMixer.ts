import { useRef, useCallback, useEffect } from 'react'
import type { Track, Clip, MediaAsset } from '../types'

interface AudioSource {
  clipId: string
  sourceNode: AudioBufferSourceNode
  gainNode: GainNode
  buffer: AudioBuffer
  startTime: number
  duration: number
  volume: number
}

interface AudioMixerOptions {
  tracks: Track[]
  currentTime: number
  isPlaying: boolean
  mediaAssets: MediaAsset[]
  mediaUrls: Map<string, string>
}

// Cache for decoded audio buffers
const audioBufferCache = new Map<string, AudioBuffer>()

async function loadAudioBuffer(
  audioContext: AudioContext,
  url: string,
  sourceId: string
): Promise<AudioBuffer | null> {
  // Check cache
  if (audioBufferCache.has(sourceId)) {
    return audioBufferCache.get(sourceId)!
  }

  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    audioBufferCache.set(sourceId, audioBuffer)
    return audioBuffer
  } catch (error) {
    console.error('Failed to load audio buffer:', error)
    return null
  }
}

export function useAudioMixer(options: AudioMixerOptions) {
  const { tracks, currentTime, isPlaying, mediaAssets, mediaUrls } = options

  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const activeSourcesRef = useRef<Map<string, AudioSource>>(new Map())
  const lastSyncTimeRef = useRef<number>(0)

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.connect(audioContextRef.current.destination)
    }
    return audioContextRef.current
  }, [])

  // Get audio clips visible at a given time
  const getAudioClipsAtTime = useCallback((time: number): { clip: Clip; track: Track }[] => {
    const clips: { clip: Clip; track: Track }[] = []

    for (const track of tracks) {
      if (track.type !== 'audio' || track.muted) continue

      for (const clip of track.clips) {
        if (time >= clip.startTime && time < clip.startTime + clip.duration) {
          clips.push({ clip, track })
        }
      }
    }

    return clips
  }, [tracks])

  // Start playing an audio clip
  const startClipPlayback = useCallback(async (
    clip: Clip,
    track: Track,
    contextTime: number,
    playbackStartTime: number
  ) => {
    const audioContext = initAudioContext()
    if (!audioContext || !masterGainRef.current) return

    const asset = mediaAssets.find(a => a.id === clip.sourceId)
    if (!asset) return

    const url = mediaUrls.get(clip.sourceId)
    if (!url) return

    // Load audio buffer
    const buffer = await loadAudioBuffer(audioContext, url, clip.sourceId)
    if (!buffer) return

    // Stop existing source for this clip
    const existingSource = activeSourcesRef.current.get(clip.id)
    if (existingSource) {
      try {
        existingSource.sourceNode.stop()
        existingSource.sourceNode.disconnect()
        existingSource.gainNode.disconnect()
      } catch {
        // Ignore errors from already stopped sources
      }
    }

    // Create source node
    const sourceNode = audioContext.createBufferSource()
    sourceNode.buffer = buffer

    // Create gain node for volume control
    const gainNode = audioContext.createGain()
    gainNode.gain.value = clip.volume * (track.muted ? 0 : 1)

    // Connect nodes
    sourceNode.connect(gainNode)
    gainNode.connect(masterGainRef.current)

    // Calculate offset within the clip
    const clipLocalTime = playbackStartTime - clip.startTime
    const sourceOffset = (clip.sourceStartTime + clipLocalTime) / 1000
    const remainingDuration = (clip.duration - clipLocalTime) / 1000

    // Start playback
    try {
      sourceNode.start(contextTime, sourceOffset, remainingDuration)

      activeSourcesRef.current.set(clip.id, {
        clipId: clip.id,
        sourceNode,
        gainNode,
        buffer,
        startTime: clip.startTime,
        duration: clip.duration,
        volume: clip.volume,
      })

      // Clean up when playback ends
      sourceNode.onended = () => {
        activeSourcesRef.current.delete(clip.id)
        sourceNode.disconnect()
        gainNode.disconnect()
      }
    } catch (error) {
      console.error('Failed to start audio playback:', error)
    }
  }, [initAudioContext, mediaAssets, mediaUrls])

  // Stop all audio playback
  const stopAllPlayback = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try {
        source.sourceNode.stop()
        source.sourceNode.disconnect()
        source.gainNode.disconnect()
      } catch {
        // Ignore errors
      }
    })
    activeSourcesRef.current.clear()
  }, [])

  // Sync audio with current playback time
  const syncAudio = useCallback(async () => {
    if (!isPlaying) {
      stopAllPlayback()
      return
    }

    const audioContext = initAudioContext()
    if (!audioContext || audioContext.state === 'suspended') {
      await audioContext?.resume()
    }

    const clipsToPlay = getAudioClipsAtTime(currentTime)
    const currentClipIds = new Set(clipsToPlay.map(c => c.clip.id))

    // Stop clips that are no longer active
    activeSourcesRef.current.forEach((source, clipId) => {
      if (!currentClipIds.has(clipId)) {
        try {
          source.sourceNode.stop()
          source.sourceNode.disconnect()
          source.gainNode.disconnect()
        } catch {
          // Ignore
        }
        activeSourcesRef.current.delete(clipId)
      }
    })

    // Start clips that should be playing
    for (const { clip, track } of clipsToPlay) {
      const existingSource = activeSourcesRef.current.get(clip.id)

      // Update volume if needed
      if (existingSource) {
        existingSource.gainNode.gain.value = clip.volume * (track.muted ? 0 : 1)
      } else {
        // Start new clip
        await startClipPlayback(clip, track, audioContext.currentTime, currentTime)
      }
    }

    lastSyncTimeRef.current = currentTime
  }, [isPlaying, currentTime, initAudioContext, getAudioClipsAtTime, stopAllPlayback, startClipPlayback])

  // Handle play/pause
  useEffect(() => {
    if (isPlaying) {
      syncAudio()
    } else {
      stopAllPlayback()
    }
  }, [isPlaying, syncAudio, stopAllPlayback])

  // Resync when seeking (time jumps more than 100ms)
  useEffect(() => {
    if (isPlaying && Math.abs(currentTime - lastSyncTimeRef.current) > 100) {
      syncAudio()
    }
  }, [currentTime, isPlaying, syncAudio])

  // Update volume in real-time
  useEffect(() => {
    activeSourcesRef.current.forEach((source, clipId) => {
      // Find the clip to get current volume
      for (const track of tracks) {
        const clip = track.clips.find(c => c.id === clipId)
        if (clip) {
          source.gainNode.gain.value = clip.volume * (track.muted ? 0 : 1)
          break
        }
      }
    })
  }, [tracks])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPlayback()
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [stopAllPlayback])

  // Set master volume
  const setMasterVolume = useCallback((volume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume
    }
  }, [])

  return {
    setMasterVolume,
    stopAllPlayback,
  }
}

// Clear audio buffer cache
export function clearAudioCache(sourceId?: string) {
  if (sourceId) {
    audioBufferCache.delete(sourceId)
  } else {
    audioBufferCache.clear()
  }
}
