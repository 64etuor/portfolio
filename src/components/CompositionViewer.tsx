'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SceneFrame } from './SceneFrame'
import type { Scene } from '@/scenes/registry'

export function CompositionViewer({
  title,
  blurb,
  scenes,
}: {
  title: string
  blurb: string
  scenes: Scene[]
}) {
  const [i, setI] = useState(0)
  const s = scenes[i]
  const atStart = i === 0
  const atEnd = i === scenes.length - 1

  return (
    <div style={{ height: 'calc(100dvh - 49px)', display: 'flex', flexDirection: 'column', background: s.bg, transition: 'background 0.4s ease' }}>
      {/* composition control bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-2 md:px-10" style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="text-sm hover:opacity-80" style={{ color: 'var(--muted)' }}>←</Link>
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</span>
          <span className="hidden truncate text-xs md:inline" style={{ color: 'var(--muted)' }}>{blurb}</span>
        </div>
        <div className="flex flex-none items-center gap-3">
          <div className="flex items-center gap-1.5">
            {scenes.map((sc, idx) => (
              <button
                key={sc.id}
                onClick={() => setI(idx)}
                title={`${sc.id} ${sc.title}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: idx === i ? 22 : 8, background: idx === i ? 'var(--accent)' : 'var(--line)' }}
              />
            ))}
          </div>
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{i + 1}/{scenes.length}</span>
          <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={atStart} className="rounded border px-2 py-1 text-xs disabled:opacity-30" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>← 이전</button>
          <button onClick={() => setI((v) => Math.min(scenes.length - 1, v + 1))} disabled={atEnd} className="rounded border px-2 py-1 text-xs disabled:opacity-30" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>다음 →</button>
        </div>
      </div>
      {/* current scene caption */}
      <div className="flex items-center gap-2 px-6 py-1.5 md:px-10" style={{ background: 'color-mix(in oklab, var(--bg) 50%, transparent)' }}>
        <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{s.id}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.title}</span>
        <span className="text-xs" style={{ color: 'var(--accent)' }}>{s.domain}</span>
        <Link href={`/s/${s.slug}`} className="ml-auto text-xs hover:opacity-80" style={{ color: 'var(--muted)' }}>단독 보기 ↗</Link>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <SceneFrame key={s.id} file={s.file} title={s.title} bg={s.bg} />
      </div>
    </div>
  )
}
