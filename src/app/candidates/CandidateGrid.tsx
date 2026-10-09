'use client'

import Link from 'next/link'
import { SceneFrame } from '@/scenes/_host/SceneFrame'
import { loaderFor } from '@/scenes/loaders'
import { SCENES_CATALOG } from '@/scenes/catalog'

const CANDIDATES = SCENES_CATALOG.filter((s) => s.candidate)

/** three.js 후보 검토 그리드 — 호버 재생, 클릭 시 /s 전체화면. */
export function CandidateGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 }}>
      {CANDIDATES.map((s, i) => {
        const load = loaderFor(s.file)
        return (
          <figure key={s.key} style={{ margin: 0 }}>
            <div style={{ aspectRatio: '16 / 9', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
              {load ? <SceneFrame load={load} title={s.title} bg={s.bg} hoverPlay /> : null}
            </div>
            <figcaption style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 2px', fontSize: 13 }}>
              <span>
                <b style={{ fontFamily: 'ui-monospace, monospace', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</b>
                {s.title}
              </span>
              <Link href={`/s/${s.slug}`} style={{ color: 'var(--accent)' }}>
                전체화면 ↗
              </Link>
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
