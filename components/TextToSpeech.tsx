"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"

interface TextToSpeechProps {
  text: string
}

export function TextToSpeech({ text }: TextToSpeechProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null)

  useEffect(() => {
    setSpeechSynthesis(window.speechSynthesis)
  }, [])

  const speak = () => {
    if (speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text)
      speechSynthesis.speak(utterance)
      setIsSpeaking(true)

      utterance.onend = () => {
        setIsSpeaking(false)
      }
    }
  }

  const stop = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  return (
    <Button onClick={isSpeaking ? stop : speak} variant="outline" size="sm" className="mt-4">
      {isSpeaking ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
      {isSpeaking ? "Stop" : "Listen"}
    </Button>
  )
}

