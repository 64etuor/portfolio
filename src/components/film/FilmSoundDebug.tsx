'use client'

import { useSyncExternalStore } from 'react'
import type { SfxEventLog, SoundEventMapper } from '@/lib/sfx'

const EMPTY: readonly SfxEventLog[] = []
const ROWS = 12

const fmtX = (e: SfxEventLog) => (e.x === null ? '' : `x${e.x.toFixed(2)}${e.toX === null ? '' : `→${e.toX.toFixed(2)}`}`)

/**
 * /film?sfx=debug — a small live ticker (bottom-left) of scene sound events: film time, scene,
 * event, id, x; dropped / limited ones greyed out with the reason. Purely informational.
 */
export function FilmSoundDebug({ mapper }: { mapper: SoundEventMapper }) {
  const log = useSyncExternalStore(mapper.subscribe, mapper.getLog, () => EMPTY)
  const rows = log.slice(-ROWS)
  return (
    <div
      aria-hidden
      data-sfx-debug
      style={{
        position: 'absolute',
        left: 12,
        bottom: 'calc(5vh + 8px)',
        zIndex: 45,
        pointerEvents: 'none',
        font: '10px/1.45 var(--font-mono, ui-monospace, monospace)',
        color: '#d8dde3',
        background: 'rgba(0,0,0,0.55)',
        padding: '6px 8px',
        borderRadius: 4,
        maxWidth: 'min(92vw, 520px)',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ opacity: 0.5 }}>sfx · scene events</div>
      {rows.map((e) => {
        const ok = e.status === 'played'
        return (
          <div key={e.n} data-sfx-row data-status={e.status} style={{ opacity: ok ? 1 : 0.4 }}>
            {(e.filmT / 1000).toFixed(2)}s {e.scene.replace(/\.html$/, '')} <b>{e.ev}</b> {e.id} {fmtX(e)}
            {e.inS > 0 ? ` +${e.inS.toFixed(2)}s` : ''} {ok ? `→ ${e.sounds.join('+')}` : `· ${e.status}: ${e.reason}`}
          </div>
        )
      })}
    </div>
  )
}
