import { type NextRequest, NextResponse } from "next/server"
import { client } from "@/sanity/lib/client"
import { generateAudioForPost } from "@/lib/generate-audio"

const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET

if (!SANITY_WEBHOOK_SECRET) {
  throw new Error("SANITY_WEBHOOK_SECRET is not set")
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Verify the webhook secret
  const secret = req.headers.get("authorization")
  if (secret !== `Bearer ${SANITY_WEBHOOK_SECRET}`) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 })
  }

  // Check if this is a new publication or an update to an existing post
  if (body._type === "post" && (body.publishedAt || body.audioFile === null)) {
    try {
      const post = await client.fetch(`*[_id == $id][0]`, { id: body._id })

      if (!post) {
        return NextResponse.json({ message: "Post not found" }, { status: 404 })
      }

      // Generate audio for the post
      await generateAudioForPost(post)

      return NextResponse.json({ message: "Audio generation initiated" })
    } catch (error) {
      console.error("Error generating audio:", error)
      return NextResponse.json({ message: "Error generating audio" }, { status: 500 })
    }
  }

  return NextResponse.json({ message: "No action taken" })
}