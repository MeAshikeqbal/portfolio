import { client } from "@/sanity/lib/client"
import type { PortableTextBlock } from "@portabletext/types"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID

if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
  throw new Error("Missing required environment variables")
}

interface SanityPost {
  _id: string
  body: PortableTextBlock[]
  audioFile?: {
    _type: string
    asset: {
      _type: string
      _ref: string
    }
  }
}

interface ElevenLabsResponse {
  detail?: {
    message?: string
  }
}

export async function generateAudioForPost(post: SanityPost): Promise<string> {
  // Extract text from the post body
  const text = post.body
    .map((block) => block.children?.map((child) => ("text" in child ? child.text : "")).join(" ") ?? "")
    .join("\n")

  // Generate audio using ElevenLabs API
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
    const errorData: ElevenLabsResponse = await response.json()
    throw new Error(`ElevenLabs API error: ${errorData.detail?.message || "Unknown error"}`)
  }

  const audioBuffer = await response.arrayBuffer()
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" })

  // Upload audio file to Sanity
  const audioFile = await client.assets.upload("file", audioBlob, {
    filename: `${post._id}-audio.mp3`,
    contentType: "audio/mpeg",
  })

  // Update the post with the new audio file
  await client
    .patch(post._id)
    .set({
      audioFile: {
        _type: "file",
        asset: {
          _type: "reference",
          _ref: audioFile._id,
        },
      },
    })
    .commit()

  return audioFile._id
}

