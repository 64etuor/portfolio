'use client'

import { useState } from 'react'

export function SceneFrame({
  file,
  title,
  bg,
  className,
}: {
  file: string
  title: string
  bg: string
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={className} style={{ position: 'relative', background: bg, width: '100%', height: '100%' }}>
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 12,
            letterSpacing: '0.2em',
          }}
        >
          LOADING · {title}
        </div>
      )}
      <iframe
        src={`/lab/${file}`}
        title={title}
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: '100%', border: 0, display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
      />
    </div>
  )
}
