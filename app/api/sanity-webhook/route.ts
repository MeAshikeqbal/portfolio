import { type NextRequest, NextResponse } from "next/server"
import { client } from "@/sanity/lib/client"
import { generateAudioForPost } from "@/lib/generate-audio"

const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET

if (!SANITY_WEBHOOK_SECRET) {
  throw new Error("SANITY_WEBHOOK_SECRET is not set")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verify the webhook secret
    const authHeader = req.headers.get("authorization")
    if (!authHeader || authHeader !== `Bearer ${SANITY_WEBHOOK_SECRET}`) {
      console.error("Invalid or missing authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if this is a new publication or an update to an existing post
    if (body._type === "post" && (body.publishedAt || body.audioFile === null)) {
      const post = await client.fetch(`*[_id == $id][0]`, { id: body._id })

      if (!post) {
        console.error(`Post not found: ${body._id}`)
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      }

      // Generate audio for the post
      await generateAudioForPost(post)

      return NextResponse.json({ message: "Audio generation initiated" })
    }

    return NextResponse.json({ message: "No action taken" })
  } catch (error) {
    console.error("Error in webhook handler:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}