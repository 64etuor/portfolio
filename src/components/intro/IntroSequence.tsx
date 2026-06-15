'use client'

import { useEffect, useRef, useState } from 'react'
import { Reel } from './Reel'
import reelData from '@content/reel.json'

type Phase = 'boot' | 'static' | 'off' | 'type' | 'reel'

const TEXT = '시대는 빠르게 변하고 있습니다.'
const BOOT_VISIBLE_MS = 3200 // 부팅 화면이 "로드된 뒤" 보이는 시간 (에셋 로딩과 동기)
const BOOT_MAX_MS = 7000 // 로드 이벤트가 안 와도 강제 진행
const STATIC_MS = 1500 // TV 지지직 (더 길게)
const OFF_MS = 950 // TV 전원 꺼짐
const TYPE_BASE = 105 // 글자당 기본 속도
const TYPE_HOLD = 950 // 타이핑 후 잠깐

const firstReelFile =
  (reelData.reel as Array<{ file: string; include: boolean }>).find((s) => s.include)?.file ?? ''

// 글자별 가변 딜레이(세련된 리듬): 공백·문장부호 뒤 약간 쉼
function charDelay(ch: string): number {
  if (ch === ' ') return TYPE_BASE + 70
  if ('.,…'.includes(ch)) return TYPE_BASE + 300
  return TYPE_BASE + Math.round((Math.sin(ch.charCodeAt(0)) + 1) * 18) // 미세 변주
}

export function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('boot')
  const [count, setCount] = useState(0) // 타이핑된 글자 수
  const fired = useRef<Record<string, boolean>>({})
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))
  const once = (key: string, fn: () => void) => {
    if (fired.current[key]) return
    fired.current[key] = true
    fn()
  }

  // 체인: boot(로드 후) → static → off → type
  const goStatic = () => once('static', () => { setPhase('static'); at(STATIC_MS, goOff) })
  const goOff = () => once('off', () => { setPhase('off'); at(OFF_MS, goType) })
  const goType = () => once('type', () => setPhase('type'))

  const onBootLoaded = () => once('bootloaded', () => at(BOOT_VISIBLE_MS, goStatic))

  // 부팅 로드 이벤트가 안 와도 강제 진행
  useEffect(() => {
    const t = setTimeout(goStatic, BOOT_MAX_MS)
    timers.current.push(t)
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 세련된 타이핑: 가변 딜레이 재귀 스케줄
  useEffect(() => {
    if (phase !== 'type') return
    let i = 0
    let alive = true
    const step = () => {
      if (!alive) return
      i += 1
      setCount(i)
      if (i >= TEXT.length) {
        at(TYPE_HOLD, () => setPhase('reel'))
        return
      }
      const t = setTimeout(step, charDelay(TEXT[i] ?? ''))
      timers.current.push(t)
    }
    const t0 = setTimeout(step, 320) // 라인 페이드인 후 시작
    timers.current.push(t0)
    return () => { alive = false }
  }, [phase])

  // ── 릴: TV 켜짐 효과로 다음 화면 등장 + 문구 겹쳐 페이드아웃 ──
  if (phase === 'reel') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000' }}>
        <div className="pf-crt-on" style={{ position: 'absolute', inset: 0, transformOrigin: 'center' }}>
          <Reel onComplete={onComplete} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 8vw', pointerEvents: 'none', animation: 'pf-fade-out 1.5s ease forwards' }}>
          <p style={{ color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px,4.2vw,52px)', fontWeight: 500, textAlign: 'center', wordBreak: 'keep-all', textShadow: '0 0 26px rgba(150,200,255,0.5)' }}>{TEXT}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, overflow: 'hidden' }}>
      {(phase === 'boot' || phase === 'static' || phase === 'off') && (
        <div className={phase === 'off' ? 'pf-crt-off' : undefined} style={{ position: 'absolute', inset: 0, transformOrigin: 'center' }}>
          <iframe
            src="/lab/05-bios-boot.html"
            title="BIOS"
            onLoad={onBootLoaded}
            style={{ width: '100%', height: '100%', border: 0, display: 'block', pointerEvents: 'none' }}
          />
          {phase === 'static' && <div className="pf-static" style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }} />}
        </div>
      )}

      {phase === 'off' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 60, height: 4, marginLeft: -30, marginTop: -2, borderRadius: 4, background: '#fff', boxShadow: '0 0 40px 12px rgba(255,255,255,0.9)', animation: 'pf-crt-dot 0.95s ease-out forwards' }} />
      )}

      {phase === 'type' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 8vw' }}>
          <p style={{ color: '#eef3f8', fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px,4.2vw,52px)', fontWeight: 500, letterSpacing: '-0.01em', textAlign: 'center', wordBreak: 'keep-all', animation: 'pf-line-in 0.5s ease both', textShadow: '0 0 26px rgba(150,200,255,0.22)' }}>
            {TEXT.slice(0, count).split('').map((c, idx) => (
              <span key={idx} className="pf-char" style={{ animationDelay: '0s' }}>{c}</span>
            ))}
            <span className="pf-caret" />
          </p>
        </div>
      )}

      {/* 첫 릴 씬 프리로드 (타이핑/꺼짐 동안 워밍 → 켜짐 즉시) */}
      {(phase === 'off' || phase === 'type') && firstReelFile && (
        <iframe src={`/lab/${firstReelFile}`} title="preload" aria-hidden style={{ position: 'absolute', width: 1, height: 1, opacity: 0, border: 0, pointerEvents: 'none', left: -9999 }} />
      )}

      <button onClick={onComplete} style={{ position: 'absolute', top: '7.5vh', right: 24, zIndex: 101, color: '#fff', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>건너뛰기 →</button>
    </div>
  )
}
