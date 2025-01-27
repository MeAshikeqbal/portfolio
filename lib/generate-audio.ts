import { client } from "@/sanity/lib/client"
import type { PortableTextBlock } from "@portabletext/types"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID
const MAX_CHUNK_LENGTH = 5000 // Approximately 5000 characters per chunk to stay under credit limit

if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
  throw new Error("Missing required environment variables")
}

interface SanityPost {
  _id: string
  body: PortableTextBlock[]
}

function splitTextIntoChunks(text: string): string[] {
  const chunks: string[] = []
  let currentChunk = ""

  // Split by sentences to avoid cutting in the middle of a sentence
  const sentences = text.split(/(?<=[.!?])\s+/)

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= MAX_CHUNK_LENGTH) {
      currentChunk += (currentChunk ? " " : "") + sentence
    } else {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = sentence
    }
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

async function generateAudioChunk(text: string): Promise<ArrayBuffer> {
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

  return await response.arrayBuffer()
}

async function concatenateAudioBuffers(buffers: ArrayBuffer[]): Promise<Blob> {
  // Convert ArrayBuffers to Uint8Arrays and concatenate
  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }

  return new Blob([result], { type: "audio/mpeg" })
}

export async function generateAudioForPost(post: SanityPost): Promise<string> {
  // Extract text from the post body
  const text = post.body
    .map((block) => block.children?.map((child) => ("text" in child ? child.text : "")).join(" ") ?? "")
    .join("\n")

  // Split text into chunks
  const chunks = splitTextIntoChunks(text)
  console.log(`Split text into ${chunks.length} chunks`)

  // Generate audio for each chunk
  const audioBuffers: ArrayBuffer[] = []
  for (const [index, chunk] of chunks.entries()) {
    console.log(`Processing chunk ${index + 1}/${chunks.length}`)
    const audioBuffer = await generateAudioChunk(chunk)
    audioBuffers.push(audioBuffer)
  }

  // Combine all audio chunks
  const combinedAudioBlob = await concatenateAudioBuffers(audioBuffers)

  // Upload combined audio file to Sanity
  const audioFile = await client.assets.upload("file", combinedAudioBlob, {
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