'use client'

import { useEffect, useRef, useState } from 'react'
import { Reel } from './Reel'

type Phase = 'boot' | 'off' | 'type' | 'reel'

const TEXT = '시대는 빠르게 변하고 있습니다.'
const BOOT_MS = 4500
const OFF_MS = 1000
const TYPE_SPEED = 95
const TYPE_HOLD = 1600

export function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('boot')
  const [typed, setTyped] = useState('')
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
  }

  // 단계 전환: boot → off → type
  useEffect(() => {
    if (phase === 'boot') after(BOOT_MS, () => setPhase('off'))
    if (phase === 'off') after(OFF_MS, () => setPhase('type'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // 타이핑
  useEffect(() => {
    if (phase !== 'type') return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(TEXT.slice(0, i))
      if (i >= TEXT.length) {
        clearInterval(id)
        after(TYPE_HOLD, () => setPhase('reel'))
      }
    }, TYPE_SPEED)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  if (phase === 'reel') return <Reel onComplete={onComplete} />

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, overflow: 'hidden' }}>
      {/* BIOS 부팅 화면 (turn-off 시 수축) */}
      {(phase === 'boot' || phase === 'off') && (
        <div className={phase === 'off' ? 'pf-crt-off' : undefined} style={{ position: 'absolute', inset: 0 }}>
          <iframe
            src="/lab/05-bios-boot.html"
            title="BIOS"
            style={{ width: '100%', height: '100%', border: 0, display: 'block', pointerEvents: 'none' }}
          />
        </div>
      )}

      {/* turn-off 마지막 밝은 점 */}
      {phase === 'off' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 60,
            height: 4,
            marginLeft: -30,
            marginTop: -2,
            borderRadius: 4,
            background: '#fff',
            boxShadow: '0 0 40px 12px rgba(255,255,255,0.9)',
            animation: 'pf-crt-dot 1s ease-out forwards',
          }}
        />
      )}

      {/* 타이핑 */}
      {phase === 'type' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 8vw' }}>
          <p
            style={{
              color: '#eaeaea',
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(22px, 4.2vw, 52px)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              textAlign: 'center',
              wordBreak: 'keep-all',
              textShadow: '0 0 22px rgba(160,200,255,0.25)',
            }}
          >
            {typed}
            <span className="pf-cursor" style={{ color: '#9fd0ff' }} />
          </p>
        </div>
      )}

      {/* Skip (boot/off/type 단계) */}
      <button
        onClick={onComplete}
        style={{ position: 'absolute', top: '7.5vh', right: 24, zIndex: 101, color: '#fff', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
      >
        건너뛰기 →
      </button>
    </div>
  )
}
