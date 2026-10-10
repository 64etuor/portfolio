'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { lerp, smooth01 } from '../_host/math'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'
import { setStyles } from '../legacy-style'

/* ════════════════════════════════════════════════════════════════
   SCENE 04 · 소통 — LOST IN TRANSLATION  (29-lost-in-translation.html 이식)
   한국어 문장이 기계 번역 레이어(mojibake/hex/bin)를 통과하며 해체되었다가
   "소통" 기저 레이어가 열리며 진짜 메시지가 재조립된다.
   ════════════════════════════════════════════════════════════════ */

/* ---------- content ---------- */
const Q = ['왜', '시스템', '구축은', '늘', '어려울까요?']
const A = [
  { t: '기술의' },
  { t: '문제가' },
  { t: '아니라,' },
  { t: '소통의', hl: '소통' },
  { t: '문제일' },
  { t: '수' },
  { t: '있습니다.' },
]
const LAYERS = [
  { id: 'L04', kr: '배포', en: 'DEPLOY' },
  { id: 'L03', kr: '구현', en: 'BUILD' },
  { id: 'L02', kr: '설계', en: 'DESIGN' },
  { id: 'L01', kr: '요구사항', en: 'SPEC' },
]
const BASE = { id: 'L00', kr: '소통', en: 'COMMUNICATION' }

/* ---------- mojibake encoder ---------- */
const CP: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘',
  0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
}
const enc = new TextEncoder()
const bytesOf = (str: string) => Array.from(enc.encode(str))
const moji = (str: string) =>
  bytesOf(str)
    .map((b) => (b < 0x80 ? String.fromCharCode(b) : b >= 0xa0 ? String.fromCharCode(b) : (CP[b] ?? '?')))
    .join('')
const hexs = (str: string) =>
  bytesOf(str)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
const bins = (str: string) =>
  bytesOf(str)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join(' ')

const TOK = Q.map((w) => ({ moji: moji(w), hex: hexs(w), bin: bins(w) }))
const DRIFT = [-1.0, 1.7, -2.4, 2.9, -3.6]

/* ---------- timeline (ms → seconds for harness) ---------- */
const T_POSE = 3.0
const T_TRANS = 8.0
const T_PEEL = 12.5
const T_RESOLVE = 16.0
const LOOP = 19.0

const BLOCKS = ['▚', '▞', '▒', '▓', '░', '█']

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = smooth01

const PHASE_TXT = [
  ['QUESTION', '질문'],
  ['TRANSLATING…', '번역'],
  ['DECODING', '해체'],
  ['COMMUNICATION', '소통'],
]

/* ---------- gloss renderer ---------- */
function renderGloss(i: number, mode: number, shimmer: number, time: number): string {
  const tk = TOK[i]
  const str = mode === 0 ? tk.moji : mode === 1 ? tk.hex : tk.bin
  if (shimmer > 0) {
    const arr = [...str]
    const n = Math.max(1, Math.round(arr.length * shimmer * 0.5))
    for (let k = 0; k < n; k++) {
      const idx = Math.abs(Math.floor(time / 70) + i * 7 + k * 13) % arr.length
      if (arr[idx] !== ' ')
        arr[idx] = ' ' + BLOCKS[(Math.floor(time / 110) + idx + i) % BLOCKS.length]
    }
    return arr.join('').replace(/ (.)/g, '<b class="blk">$1</b>')
  }
  return str
}

export default function Scene({ running = true, onReady }: SceneProps) {
  /* overlay element refs */
  const axisRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const flickRef = useRef<HTMLDivElement | null>(null)
  const fillRef = useRef<HTMLDivElement | null>(null)
  const phaseRef = useRef<HTMLSpanElement | null>(null)
  const dividerRef = useRef<HTMLDivElement | null>(null)

  /* per-word element ref arrays (populated in DOM init effect) */
  const srcWRef = useRef<HTMLSpanElement[]>([])
  const glsWRef = useRef<HTMLSpanElement[]>([])
  const ansWRef = useRef<HTMLSpanElement[]>([])
  const lyrElsRef = useRef<HTMLDivElement[]>([])

  /* DOM containers for dynamic build */
  const sourceContainerRef = useRef<HTMLDivElement | null>(null)
  const glossContainerRef = useRef<HTMLDivElement | null>(null)
  const answerContainerRef = useRef<HTMLDivElement | null>(null)
  const layersContainerRef = useRef<HTMLDivElement | null>(null)

  /* sizing unit (min(1vw, 1.778vh)) — updated on resize */
  const uRef = useRef(0)

  useSceneReady(onReady)

  /* build dynamic DOM once on mount */
  useEffect(() => {
    const srcEl = sourceContainerRef.current
    const glsEl = glossContainerRef.current
    const ansEl = answerContainerRef.current
    const lyrWrap = layersContainerRef.current
    if (!srcEl || !glsEl || !ansEl || !lyrWrap) return

    srcWRef.current = []
    glsWRef.current = []
    ansWRef.current = []
    lyrElsRef.current = []

    Q.forEach((w) => {
      const el = document.createElement('span')
      el.className = `${s.srcWord} ${s.kr}`
      el.textContent = w
      srcEl.appendChild(el)
      srcWRef.current.push(el)
    })

    TOK.forEach(() => {
      const el = document.createElement('span')
      el.className = s.glsWord
      glsEl.appendChild(el)
      glsWRef.current.push(el)
    })

    A.forEach((a) => {
      const el = document.createElement('span')
      el.className = `${s.ansWord} ${s.kr}`
      if (a.hl) {
        const i = a.t.indexOf(a.hl)
        el.innerHTML =
          a.t.slice(0, i) +
          `<span class="${s.hl}">` +
          a.hl +
          '</span>' +
          a.t.slice(i + a.hl.length)
      } else {
        el.textContent = a.t
      }
      ansEl.appendChild(el)
      ansWRef.current.push(el)
    })

    ;[...LAYERS, BASE].forEach((L) => {
      if (L === BASE) {
        const hr = document.createElement('div')
        hr.className = s.divider
        dividerRef.current = hr
        lyrWrap.appendChild(hr)
      }
      const d = document.createElement('div')
      d.className = s.lyr + (L === BASE ? ' ' + s.lyrBase : '')
      d.innerHTML =
        `<span class="${s.lyrId}">${L.id}</span>` +
        `<span class="${s.lyrKr} ${s.kr}">${L.kr}</span>` +
        `<span class="${s.lyrEn}">${L.en}</span>`
      lyrWrap.appendChild(d)
      lyrElsRef.current.push(d as HTMLDivElement)
    })
  }, [])

  /* sizing unit sync */
  useEffect(() => {
    const update = () => {
      uRef.current = Math.min(window.innerWidth / 100, (window.innerHeight / 100) * 1.778)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  /* canvas is only used for --s CSS variable injection (no canvas drawing in this scene) */
  const ref = useSceneCanvas((_g, fr) => {
    /* set --s sizing unit on root */
    const U = Math.min(fr.w / 100, (fr.h / 100) * 1.778)
    uRef.current = U

    const time = fr.t * 1000 // ms equivalent
    const t = fr.t % LOOP   // seconds within loop

    const pPose   = clamp(t / T_POSE)
    const pTr     = clamp((t - T_POSE) / (T_TRANS - T_POSE))
    const pPeel   = clamp((t - T_TRANS) / (T_PEEL - T_TRANS))
    const pRes    = clamp((t - T_PEEL) / (T_RESOLVE - T_PEEL))
    const pRel    = clamp((t - T_RESOLVE) / (LOOP - T_RESOLVE))

    /* phase label */
    const phaseIdx = t < T_POSE ? 0 : t < T_TRANS ? 1 : t < T_PEEL ? 2 : 3
    const phaseEl = phaseRef.current
    if (phaseEl && phaseEl.dataset['k'] !== '' + phaseIdx) {
      phaseEl.dataset['k'] = '' + phaseIdx
      const p = PHASE_TXT[phaseIdx]
      phaseEl.textContent = p[1] + ' / ' + p[0]
    }

    /* SOURCE words */
    const srcMaster = clamp(pPose) * (1 - smooth(pPeel))
    srcWRef.current.forEach((el, i) => {
      const intro = smooth((pPose - i * 0.1) / 0.5)
      const wordX = (i + 0.5) / Q.length
      const headPos = pTr
      const near = Math.exp(-Math.pow((wordX - headPos) / 0.14, 2))
      const destab = pTr * (1 - pPeel)
      const blur = destab * near * 2.6
      const dy = Math.sin(time / 420 + i * 1.7) * destab * near * 5
      const dim = 1 - destab * near * 0.45
      setStyles(el, {
        opacity: (t < T_POSE ? intro : srcMaster).toFixed(3),
        filter: `blur(${blur.toFixed(2)}px)`,
        transform: `translateY(${dy.toFixed(2)}px)`,
        color: `rgba(215,215,215,${dim.toFixed(3)})`,
      })
    })

    /* GLOSS words */
    const glsMaster = smooth(pTr) * (1 - smooth(pPeel))
    glsWRef.current.forEach((el, i) => {
      if (glsMaster <= 0.001) { el.style.opacity = '0'; return }
      const mode = Math.floor(time / 950 + i * 0.6) % 3
      const wordX = (i + 0.5) / Q.length
      const near = Math.exp(-Math.pow((wordX - pTr) / 0.16, 2))
      const shimmer = (pTr < 1 ? near : 0) * (1 - pPeel)
      el.innerHTML = renderGloss(i, mode, shimmer, time)
      const drift = DRIFT[i] * U * 1.5 * (smooth(pTr) * (1 - smooth(pPeel)))
      const dy = Math.sin(time / 520 + i * 2.1) * 1.6 * (1 - pPeel)
      setStyles(el, {
        transform: `translate(${drift.toFixed(2)}px,${dy.toFixed(2)}px)`,
        opacity: (glsMaster * lerp(0.5, 0.92, near)).toFixed(3),
      })
    })

    /* translation HEAD + AXIS */
    const headVis = smooth(pTr * 4) * (1 - smooth(pPeel))
    if (axisRef.current)
      axisRef.current.style.opacity = (smooth(pTr * 3) * (1 - smooth(pPeel)) * 0.9).toFixed(3)
    if (headRef.current) {
      const L = 22 * U
      const R = fr.w - 6 * U
      const x = lerp(L, R, pTr)
      setStyles(headRef.current, { opacity: (headVis * 0.9).toFixed(3), left: x.toFixed(1) + 'px' })
    }

    /* LAYER PEEL */
    lyrElsRef.current.forEach((el, i) => {
      if (i < 4) {
        const trig = clamp((pPeel - i * 0.18) / 0.34)
        let peeled = smooth(trig)
        peeled *= 1 - smooth(pRel)
        const x = -peeled * 40
        setStyles(el, {
          transform: `translateX(${x.toFixed(1)}px)`,
          opacity: lerp(0.85, 0, peeled).toFixed(3),
          color: `rgba(141,141,141,${(1 - peeled).toFixed(3)})`,
        })
      } else {
        const lit = smooth(pPeel) * (1 - smooth(pRel * 0.8))
        const pulse = 0.5 + 0.5 * Math.sin(time / 700)
        const glow = lit * (0.55 + 0.45 * pulse)
        setStyles(el, {
          color: `rgba(205,163,95,${lerp(0.45, 1, lit).toFixed(3)})`,
          textShadow: `0 0 ${(glow * 12).toFixed(1)}px rgba(205,163,95,${(glow * 0.5).toFixed(2)})`,
          transform: 'translateX(0)',
        })
      }
    })
    if (dividerRef.current)
      dividerRef.current.style.opacity = (0.5 + 0.4 * smooth(pPeel) * (1 - smooth(pRel))).toFixed(2)

    /* ANSWER words */
    ansWRef.current.forEach((el, i) => {
      const inP = smooth((pPeel - i * 0.07) / 0.4)
      const op = inP * (1 - smooth(pRel))
      const blur = (1 - inP) * 4.0 * (1 - pRel)
      const dy = lerp(10, 0, inP)
      setStyles(el, {
        opacity: op.toFixed(3),
        filter: `blur(${(blur * (1 - pRes)).toFixed(2)}px)`,
        transform: `translateY(${(dy * (1 - pRes)).toFixed(2)}px)`,
      })
      const hl = el.querySelector<HTMLElement>(`.${s.hl}`)
      if (hl) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 620)
        const g = inP * (0.6 + 0.4 * pulse) * (1 - smooth(pRel))
        hl.style.textShadow = `0 0 ${(g * 16).toFixed(1)}px rgba(205,163,95,${(g * 0.6).toFixed(2)})`
      }
    })

    /* SIGNAL ALIGN gauge */
    let align = 1
    align -= smooth(pTr) * 0.78
    align += smooth(pPeel) * 0.55
    align += smooth(pRes) * 0.25
    align = clamp(align, 0.06, 1)
    const jit = pTr > 0 && pPeel < 1 ? Math.sin(time / 90) * 0.012 * (1 - pPeel) : 0
    if (fillRef.current) {
      setStyles(fillRef.current, {
        width: ((align + jit) * 100).toFixed(1) + '%',
        opacity: (0.4 + 0.6 * align).toFixed(2),
      })
    }

    /* film flicker */
    if (flickRef.current)
      flickRef.current.style.opacity = (0.5 + 0.5 * Math.sin(time / 55)).toFixed(2)
  }, { running })

  return (
    <SceneHost
      className={s.root}
      bg="#050505"
      style={{ ['--s' as string]: `min(1vw, 1.778vh)` }}
    >
      {/* canvas (used for tick loop / sizing unit; no drawing) */}
      <canvas ref={ref} className={s.c} style={{ opacity: 0 }} />

      <div ref={flickRef} className={s.flick} />

      <div className={s.stage}>
        <div className={s.frame}>
          <span className={`${s.tick} ${s.tickTl}`} />
          <span className={`${s.tick} ${s.tickTr}`} />
          <span className={`${s.tick} ${s.tickBl}`} />
          <span className={`${s.tick} ${s.tickBr}`} />
        </div>

        <div className={`${s.eyebrow} ${s.kr}`}>
          <b>SCENE 04</b> · 소통 — LOST IN TRANSLATION
        </div>
        <div className={`${s.cap} ${s.capTr}`}>
          STATUS · <span ref={phaseRef} className={`${s.phase} ${s.kr}`}>질문 / QUESTION</span>
        </div>

        <div ref={axisRef} className={s.axis} />
        <div ref={headRef} className={s.head} />

        <div ref={layersContainerRef} className={s.layers} />

        <div className={s.typo}>
          <div ref={sourceContainerRef} className={s.source} />
          <div ref={glossContainerRef} className={s.gloss} />
        </div>
        <div ref={answerContainerRef} className={s.answer} />

        <div className={s.gauge}>
          <div className={`${s.gaugeLab} ${s.kr}`}>
            신호 정합 · <b>SIGNAL ALIGN</b>
          </div>
          <div className={s.bar}>
            <div ref={fillRef} className={s.fill} />
            <span className={s.notch} style={{ left: '25%' }} />
            <span className={s.notch} style={{ left: '50%' }} />
            <span className={s.notch} style={{ left: '75%' }} />
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
