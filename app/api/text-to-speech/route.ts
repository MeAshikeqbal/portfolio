import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { verifyToken } from "@/lib/auth"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID
const API_SECRET_KEY = process.env.API_SECRET_KEY

if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID || !API_SECRET_KEY) {
  throw new Error("Missing required environment variables")
}

export async function POST(req: NextRequest) {
  try {
    const headersList = headers()
    const apiKey = (await headersList).get("x-api-key")

    if (!apiKey || !verifyToken(apiKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { text } = await req.json()

    if (typeof text !== "string" || text.length === 0 ) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`ElevenLabs API error: ${errorData.detail?.message || "Unknown error"}`)
    }

    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg" },
    })
  } catch (error) {
    console.error("Text-to-speech error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}

