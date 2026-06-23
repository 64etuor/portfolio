import { ImageResponse } from 'next/og'
import { PROFILE } from '@content/index'

export const runtime = 'edge'
export const alt = `${PROFILE.identity.name} · Portfolio`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#050505',
          color: '#f5f5f0',
        }}
      >
        <div style={{ fontSize: 32, letterSpacing: 8, color: '#9aa0a6' }}>PORTFOLIO</div>
        <div style={{ fontSize: 120, fontWeight: 700, marginTop: 16 }}>
          {PROFILE.identity.nameEn}
        </div>
        <div style={{ fontSize: 40, marginTop: 24, color: '#c8cdd2' }}>
          {PROFILE.identity.name} · {PROFILE.identity.tagline}
        </div>
      </div>
    ),
    { ...size },
  )
}
