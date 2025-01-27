"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, RotateCcw, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TextToSpeechProps {
  audioUrl: string
}

const speedOptions = [0.5, 1, 1.5, 2, 3]

export function TextToSpeech({ audioUrl }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const audioElement = new Audio(audioUrl)
    audioRef.current = audioElement
    audioElement.addEventListener("loadedmetadata", handleLoadedMetadata)
    audioElement.addEventListener("timeupdate", handleTimeUpdate)
    audioElement.addEventListener("ended", () => setIsPlaying(false))
    audioElement.addEventListener("canplay", () => setIsLoading(false))
    audioElement.addEventListener("error", () => {
      setError("Failed to load audio")
      setIsLoading(false)
    })

    return () => {
      audioElement.pause()
      audioElement.currentTime = 0
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audioElement.removeEventListener("timeupdate", handleTimeUpdate)
      audioElement.removeEventListener("ended", () => setIsPlaying(false))
      audioElement.removeEventListener("canplay", () => setIsLoading(false))
      audioElement.removeEventListener("error", () => {
        setError("Failed to load audio")
        setIsLoading(false)
      })
    }
  }, [audioUrl])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [speed])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && audioRef.current) {
      const rect = progressRef.current.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      audioRef.current.currentTime = pos * duration
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out",
              "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 sm:ml-1" />
            )}
          </button>
          <button
            onClick={restart}
            className="w-8 h-8 sm:w-10 sm:h-10 p-1.5 sm:p-2 hover:bg-accent hover:text-accent-foreground rounded-full transition-colors"
            aria-label="Restart"
          >
            <RotateCcw className="w-full h-full" />
          </button>
        </div>

        <div className="w-full sm:flex-1 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-2 bg-secondary rounded-full cursor-pointer overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-all duration-200 ease-in-out"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2 sm:mt-0">
          {speedOptions.map((option) => (
            <button
              key={option}
              onClick={() => setSpeed(option)}
              className={cn(
                "px-1 sm:px-2 py-1 text-xs sm:text-sm rounded-full transition-colors",
                speed === option
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {option}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

