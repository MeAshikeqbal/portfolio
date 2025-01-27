import { createHmac } from "crypto"

const API_SECRET_KEY = process.env.API_SECRET_KEY

if (!API_SECRET_KEY) {
  throw new Error("API_SECRET_KEY is not set")
}

export function generateToken(data: string): string {
  const hmac = createHmac("sha256", API_SECRET_KEY!)
  hmac.update(data)
  return hmac.digest("hex")
}

export function verifyToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token)
}

