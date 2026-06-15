'use client'

import { useEffect, useRef, useState } from 'react'
import reelData from '@content/reel.json'
import { sceneById } from '@/scenes/registry'

interface Frame {
  id: string
  file: string
  durationMs: number
  title: string
  bg: string
}

const FRAMES: Frame[] = (reelData.reel as Array<{ id: string; file: string; durationMs: number; include: boolean }>)
  .filter((s) => s.include)
  .map((s) => {
    const sc = sceneById(s.id)
    return { id: s.id, file: s.file, durationMs: s.durationMs, title: sc?.title ?? s.id, bg: sc?.bg ?? '#000' }
  })

const TRANSITION = (reelData.defaults?.transitionMs as number) ?? 900

/**
 * 영화식 릴: reel.json 순서대로 시안(iframe)을 durationMs 동안 보여주고
 * 두 레이어 크로스페이드로 전환. 마지막 후 onComplete.
 */
export function Reel({ onComplete }: { onComplete: () => void }) {
  // 두 레이어: A(0)/B(1). top = 현재 보이는 레이어.
  const [layers, setLayers] = useState<[string, string]>([FRAMES[0]?.file ?? '', ''])
  const [top, setTop] = useState(0)
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (FRAMES.length === 0) {
      onComplete()
      return
    }
    let curIdx = 0
    let curTop = 0
    let cancelled = false

    const scheduleAdvance = (i: number) => {
      const dur = FRAMES[i].durationMs
      const start = performance.now()
      // 진행바
      const tick = () => {
        if (cancelled) return
        const p = Math.min(1, (performance.now() - start) / dur)
        setProgress(p)
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      advanceTimer.current = setTimeout(() => {
        if (cancelled) return
        const next = i + 1
        if (next >= FRAMES.length) {
          onComplete()
          return
        }
        // 다음 프레임을 숨은 레이어에 로드 후 크로스페이드
        const hidden = 1 - curTop
        setLayers((prev) => {
          const arr: [string, string] = [...prev] as [string, string]
          arr[hidden] = FRAMES[next].file
          return arr
        })
        // 살짝 뒤 페이드 스왑(로드 시간 확보)
        setTimeout(() => {
          if (cancelled) return
          curTop = hidden
          curIdx = next
          setTop(curTop)
          setIdx(curIdx)
          scheduleAdvance(curIdx)
        }, 420)
      }, dur)
    }

    scheduleAdvance(0)
    return () => {
      cancelled = true
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cur = FRAMES[idx]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100 }}>
      {[0, 1].map((layer) => (
        <iframe
          key={layer}
          src={layers[layer] ? `/lab/${layers[layer]}` : 'about:blank'}
          title={`reel-${layer}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
            opacity: top === layer ? 1 : 0,
            transition: `opacity ${TRANSITION}ms ease`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* 시네마틱 비네트 + 레터박스 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 220px rgba(0,0,0,0.65)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6vh', background: '#000', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6vh', background: '#000', pointerEvents: 'none' }} />

      {/* 캡션 */}
      <div style={{ position: 'absolute', left: 24, bottom: '7.5vh', color: '#fff', fontFamily: 'var(--font-sans)', textShadow: '0 1px 8px rgba(0,0,0,0.9)', pointerEvents: 'none' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', opacity: 0.7 }}>{cur?.id} / {FRAMES.length}</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{cur?.title}</div>
      </div>

      {/* 진행바 */}
      <div style={{ position: 'absolute', left: 0, bottom: '6vh', height: 2, width: `${progress * 100}%`, background: 'var(--accent)', transition: 'width 80ms linear' }} />

      {/* Skip */}
      <button
        onClick={onComplete}
        style={{ position: 'absolute', top: '7.5vh', right: 24, zIndex: 101, color: '#fff', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
      >
        건너뛰기 →
      </button>
    </div>
  )
}
