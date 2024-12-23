import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Ashik Eqbal'
  const description = searchParams.get('description') || 'Software Engineer and Web Developer'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div style={{ marginBottom: 20 }}>{title}</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
          }}
        >
          {description}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

