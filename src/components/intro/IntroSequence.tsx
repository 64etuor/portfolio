'use client'

import { useEffect, useRef, useState } from 'react'
import { Reel } from './Reel'

type Phase = 'boot' | 'static' | 'off' | 'type' | 'reel'

const TEXT = '시대는 빠르게 변하고 있습니다.'
const BOOT_MS = 4200 // 부팅 화면 자연스럽게 이어짐
const STATIC_MS = 750 // TV 지지직
const OFF_MS = 950 // TV 전원 꺼짐
const TYPE_SPEED = 95
const TYPE_HOLD = 850 // 타이핑 후 잠깐

export function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('boot')
  const [typed, setTyped] = useState('')
  const started = useRef(false)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  // 단일 절대 타임라인 — 정확히 한 번만 실행(반복/재시작 방지)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))
    at(BOOT_MS, () => setPhase('static'))
    at(BOOT_MS + STATIC_MS, () => setPhase('off'))
    at(BOOT_MS + STATIC_MS + OFF_MS, () => setPhase('type'))
    return () => timers.current.forEach(clearTimeout)
  }, [])

  // 타이핑 → 끝나면 릴(TV 켜짐)
  useEffect(() => {
    if (phase !== 'type') return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(TEXT.slice(0, i))
      if (i >= TEXT.length) {
        clearInterval(id)
        const t = setTimeout(() => setPhase('reel'), TYPE_HOLD)
        timers.current.push(t)
      }
    }, TYPE_SPEED)
    return () => clearInterval(id)
  }, [phase])

  // 릴 단계: 다음 화면들이 TV 켜지는 효과로 등장 + 타이핑 문구가 잠깐 겹쳤다 사라짐
  if (phase === 'reel') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000' }}>
        <div className="pf-crt-on" style={{ position: 'absolute', inset: 0, transformOrigin: 'center' }}>
          <Reel onComplete={onComplete} />
        </div>
        {/* 켜지는 동안 문구가 겹쳤다 사라짐 */}
        <div
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            padding: '0 8vw', pointerEvents: 'none',
            animation: 'pf-fade-out 1.4s ease forwards',
          }}
        >
          <p style={{ color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px,4.2vw,52px)', fontWeight: 500, textAlign: 'center', wordBreak: 'keep-all', textShadow: '0 0 24px rgba(160,200,255,0.4)' }}>
            {TEXT}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, overflow: 'hidden' }}>
      {/* 부팅 → 지지직 → 꺼짐: 같은 스테이지를 transform 으로 수축 */}
      {(phase === 'boot' || phase === 'static' || phase === 'off') && (
        <div className={phase === 'off' ? 'pf-crt-off' : undefined} style={{ position: 'absolute', inset: 0, transformOrigin: 'center' }}>
          <iframe
            src="/lab/05-bios-boot.html"
            title="BIOS"
            style={{ width: '100%', height: '100%', border: 0, display: 'block', pointerEvents: 'none' }}
          />
          {/* TV 지지직 오버레이 */}
          {phase === 'static' && (
            <div className="pf-static" style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }} />
          )}
        </div>
      )}

      {/* 꺼짐 마지막 밝은 점 */}
      {phase === 'off' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 60, height: 4, marginLeft: -30, marginTop: -2, borderRadius: 4, background: '#fff', boxShadow: '0 0 40px 12px rgba(255,255,255,0.9)', animation: 'pf-crt-dot 0.95s ease-out forwards' }} />
      )}

      {/* 타이핑(암전 위) */}
      {phase === 'type' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 8vw' }}>
          <p style={{ color: '#eaeaea', fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px,4.2vw,52px)', fontWeight: 500, letterSpacing: '-0.01em', textAlign: 'center', wordBreak: 'keep-all', textShadow: '0 0 22px rgba(160,200,255,0.25)' }}>
            {typed}
            <span className="pf-cursor" style={{ color: '#9fd0ff' }} />
          </p>
        </div>
      )}

      <button
        onClick={onComplete}
        style={{ position: 'absolute', top: '7.5vh', right: 24, zIndex: 101, color: '#fff', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
      >
        건너뛰기 →
      </button>
    </div>
  )
}
