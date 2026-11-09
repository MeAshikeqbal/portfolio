#!/usr/bin/env node
/**
 * One-time Spotify authorization for /api/now-playing. Prints a refresh token to put in
 * Vercel as SPOTIFY_REFRESH_TOKEN; nothing is written to disk.
 *
 *   SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/spotify-auth.mjs
 *
 * The app's redirect URIs must include http://127.0.0.1:8888/callback (Spotify only allows
 * loopback IPs for http redirects).
 */
import { randomBytes } from "node:crypto"
import { createServer } from "node:http"

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env
if (!id || !secret) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.")
  process.exit(1)
}

const redirectUri = "http://127.0.0.1:8888/callback"
const state = randomBytes(16).toString("hex")
const authorize = new URL("https://accounts.spotify.com/authorize")
authorize.search = new URLSearchParams({
  response_type: "code",
  client_id: id,
  scope: "user-read-currently-playing user-read-recently-played",
  redirect_uri: redirectUri,
  state,
}).toString()

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", redirectUri)
  if (url.pathname !== "/callback") return res.writeHead(404).end()
  const code = url.searchParams.get("code")
  if (url.searchParams.get("state") !== state || !code) {
    res.writeHead(400).end("State mismatch or missing code; run the script again.")
    return
  }
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })
  const json = await response.json()
  if (!json.refresh_token) {
    res.writeHead(500).end("Spotify didn't return a refresh token; see the terminal.")
    console.error(json)
  } else {
    res.end("Done: the refresh token is in your terminal. You can close this tab.")
    console.log(`\nSPOTIFY_REFRESH_TOKEN=${json.refresh_token}\n`)
  }
  server.close()
})

server.listen(8888, "127.0.0.1", () => {
  console.log(`Open this URL and approve access:\n\n${authorize}\n`)
})
