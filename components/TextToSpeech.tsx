"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TextToSpeechProps {
  audioUrl: string
  title?: string
  subtitle?: string
  showDownload?: boolean
  showVolumeControl?: boolean
  className?: string
  autoPlay?: boolean
}

/**
 * A client-side React audio player for a single audio URL with controls for play/pause,
 * restart, seek, volume/mute, and optional download.
 *
 * Renders an HTMLAudioElement and synchronizes UI state (playback, progress, duration,
 * volume, loading, and error) with native audio events. If `autoPlay` is true the player
 * will attempt to start playback when the audio can play.
 *
 * @param audioUrl - Source URL of the audio to play.
 * @param title - Optional heading shown above the controls. Defaults to `"Audio Player"`.
 * @param subtitle - Optional subheading shown under the title.
 * @param showDownload - If true, shows a download button for the audio file. Defaults to `true`.
 * @param showVolumeControl - If true, shows mute toggle and volume slider. Defaults to `true`.
 * @param className - Optional additional CSS classes applied to the outer Card container.
 * @param autoPlay - If true, attempts to autoplay when the audio is ready. Defaults to `false`.
 * @returns A JSX element containing the audio player UI or an error card if the audio fails to load.
 */
export function TextToSpeech({
  audioUrl,
  title = "Audio Player",
  subtitle,
  showDownload = true,
  showVolumeControl = true,
  className,
  autoPlay = false,
}: TextToSpeechProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = () => {
      setError("Failed to load audio file")
      setIsLoading(false)
    }

    const handleCanPlay = () => {
      setError(null)
      if (autoPlay) {
        audio.play()
        setIsPlaying(true)
      }
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)
    audio.addEventListener("canplay", handleCanPlay)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      audio.removeEventListener("canplay", handleCanPlay)
    }
  }, [audioUrl, autoPlay])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = (value[0] / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = value[0] / 100
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const handleRestart = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = 0
    setCurrentTime(0)
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = audioUrl
    link.download = title || "audio"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p className="font-medium">Error loading audio</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardContent className="p-6">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* Title and Subtitle */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
            disabled={isLoading}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRestart}
              disabled={isLoading}
              aria-label="Restart audio"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={togglePlayPause}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Volume Control */}
          {showVolumeControl && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <div className="w-16">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Download Button */}
          {showDownload && (
            <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Download audio">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
