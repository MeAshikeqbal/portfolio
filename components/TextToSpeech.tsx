"use client"

import { useState, useEffect, useRef } from "react"
import { Howl } from "howler"
import { Play, Pause, RotateCcw, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useMediaQuery } from "@/hooks/use-media-query"

interface TextToSpeechProps {
  audioUrl: string
}

const speedOptions = [0.5, 1, 1.5, 2]

export function TextToSpeech({ audioUrl }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const soundRef = useRef<Howl | null>(null)
  const isMobile = useMediaQuery("(max-width: 640px)")

  useEffect(() => {
    const sound = new Howl({
      src: [audioUrl],
      html5: true,
      format: ["mp3"],
      onload: () => {
        setIsLoading(false)
        setDuration(sound.duration())
      },
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => setIsPlaying(false),
      onend: () => setIsPlaying(false),
      onloaderror: () => {
        setError("Failed to load audio")
        setIsLoading(false)
      },
      onplayerror: () => {
        setError("Failed to play audio")
        setIsPlaying(false)
      },
    })

    soundRef.current = sound

    return () => {
      sound.unload()
    }
  }, [audioUrl])

  useEffect(() => {
    const updateTime = () => {
      if (soundRef.current && soundRef.current.playing()) {
        setCurrentTime(soundRef.current.seek() as number)
        requestAnimationFrame(updateTime)
      }
    }

    if (isPlaying) {
      updateTime()
    }
  }, [isPlaying])

  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.rate(speed)
    }
  }, [speed])

  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.volume(volume)
    }
  }, [volume])

  const togglePlay = () => {
    if (soundRef.current) {
      if (isPlaying) {
        soundRef.current.pause()
      } else {
        soundRef.current.play()
      }
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (soundRef.current) {
      soundRef.current.seek(value[0])
      setCurrentTime(value[0])
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const restart = () => {
    if (soundRef.current) {
      soundRef.current.stop()
      soundRef.current.play()
    }
  }

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0)
    } else {
      setVolume(1)
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
    <div className="space-y-4 pt-2">
      <div className={`flex items-center ${isMobile ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center space-x-2">
          <Button onClick={togglePlay} variant="outline" size="icon" className="w-12 h-12 rounded-full">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>
          <Button
            onClick={restart}
            variant="outline"
            size="icon"
            className="w-10 h-10 rounded-full"
            aria-label="Restart"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
        {!isMobile && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={toggleMute}
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full"
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              {volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Slider
              value={[volume]}
              max={1}
              step={0.1}
              onValueChange={(value) => setVolume(value[0])}
              className="w-24"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Slider value={[currentTime]} max={duration} step={0.1} onValueChange={handleSliderChange} className="w-full" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex justify-center space-x-2">
        {speedOptions.map((option) => (
          <Button
            key={option}
            onClick={() => setSpeed(option)}
            variant={speed === option ? "default" : "outline"}
            size="sm"
            className="rounded-full"
          >
            {option}x
          </Button>
        ))}
      </div>
    </div>
  )
}

