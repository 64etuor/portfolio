'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { clamp, ease } from '../_host/math'
import { useSceneReady } from '../_host/useSceneReady'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════════════
   SCENE 01 — "시대는 빠르게 변하고 있습니다"  ·  사진 넘기는(montage) 씬.
   시대를 상징하는 사진이 점점 빠르게 넘어가고(가속), 막판에 헤드라인이 박힌다.
   ════════════════════════════════════════════════════════════════════════ */

const PHOTOS = [
  'assets/eras/01.jpg',
  'assets/eras/02.jpg',
  'assets/eras/03.jpg',
  'assets/eras/04.jpg',
  'assets/eras/05.jpg',
  'assets/eras/06.jpg',
  'assets/eras/07.jpg',
  'assets/eras/08.jpg',
  'assets/eras/09.jpg',
  'assets/eras/10.jpg',
  'assets/eras/11.jpg',
  'assets/eras/12.jpg',
  'assets/eras/13.jpg',
  'assets/eras/14.jpg',
  'assets/eras/15.jpg',
  'assets/eras/16.jpg',
  'assets/eras/17.jpg',
  'assets/eras/18.jpg',
  'assets/eras/19.jpg',
  'assets/eras/20.jpg',
  'assets/eras/21.jpg',
  'assets/eras/22.jpg',
  'assets/eras/23.jpg',
  'assets/eras/24.png',
  'assets/eras/25.jpg',
  'assets/eras/26.jpg',
  'assets/eras/27.jpg',
  'assets/eras/28.jpg',
  'assets/eras/29.jpg',
  'assets/eras/30.jpg',
  'assets/eras/31.jpg',
  'assets/eras/32.webp',
  'assets/eras/33.png',
]

const CYCLE = 8200
const ACCEL_END = 0.8

type EraFrame = { url: string; i: number } | { placeholder: number }

const FRAMES: EraFrame[] =
  PHOTOS.length > 0 ? PHOTOS.map((url, i) => ({ url, i })) : Array.from({ length: 8 }, (_, i) => ({ placeholder: i + 1 }))

const N = Math.min(FRAMES.length, 40)
// 가속 곡선 — 기하급수(각 컷 = 이전의 ACCEL_DECAY 배). 선형보다 슬로우→패스트 대비가 확실.
// N=33·window≈6.5s 기준 첫 컷 ~0.5s(느림) → 끝 ~50ms(빠름), 약 10배 가속.
const ACCEL_DECAY = 0.93
const DURS = Array.from({ length: N }, (_, k) => Math.pow(ACCEL_DECAY, k))
const TOTAL = DURS.reduce((a, b) => a + b, 0) || 1
let scheduleAcc = 0
const CUM = DURS.map((dur) => {
  const v = (scheduleAcc / TOTAL) * ACCEL_END
  scheduleAcc += dur
  return v
})

const assetUrl = (url: string) => (url.startsWith('/') ? url : `/lab/${url}`)

// The montage used to fetch every photo on mount (the largest originals were
// multi-megabyte). Warm a short window and pull the next frames as cuts advance.
const PRELOAD_AHEAD = 4
const warmed = new Set<string>()
function warmPhotos(from: number, count = PRELOAD_AHEAD) {
  for (let i = 0; i < count; i++) {
    const photo = PHOTOS[(from + i) % PHOTOS.length]
    if (!photo) continue
    const url = assetUrl(photo)
    if (warmed.has(url)) continue
    warmed.add(url)
    const im = new Image()
    im.decoding = 'async'
    im.src = url
  }
}

function setFrame(img: HTMLDivElement, ph: HTMLDivElement, phn: HTMLSpanElement, idx: number) {
  const frame = FRAMES[idx % FRAMES.length]
  if ('url' in frame) {
    img.style.backgroundImage = `url('${assetUrl(frame.url)}')`
    return img
  }
  phn.textContent = String(frame.placeholder).padStart(2, '0')
  return ph
}

export default function Scene({ locale = 'ko', running = true, onReady }: SceneProps) {
  const english = locale === 'en'
  const slideARef = useRef<HTMLDivElement | null>(null)
  const slideBRef = useRef<HTMLDivElement | null>(null)
  const phARef = useRef<HTMLDivElement | null>(null)
  const phBRef = useRef<HTMLDivElement | null>(null)
  const phAnRef = useRef<HTMLSpanElement | null>(null)
  const phBnRef = useRef<HTMLSpanElement | null>(null)
  const flashRef = useRef<HTMLDivElement | null>(null)
  const headlineRef = useRef<HTMLDivElement | null>(null)
  const subRef = useRef<HTMLDivElement | null>(null)
  const lastCut = useRef(-1)
  const flashStart = useRef(-1) // 컷 셔터 플래시 시작 시각(초); draw 에서 시간기반 감쇠
  const front = useRef(0)

  useEffect(() => {
    warmPhotos(0, 6)
  }, [])

  useSceneReady(onReady)

  const showCut = (ci: number) => {
    const slideA = slideARef.current
    const slideB = slideBRef.current
    const phA = phARef.current
    const phB = phBRef.current
    const phAn = phAnRef.current
    const phBn = phBnRef.current
    const flash = flashRef.current
    if (!slideA || !slideB || !phA || !phB || !phAn || !phBn || !flash) return

    front.current ^= 1
    const A = front.current === 0 ? { img: slideA, ph: phA, phn: phAn } : { img: slideB, ph: phB, phn: phBn }
    const B = front.current === 0 ? { img: slideB, ph: phB } : { img: slideA, ph: phA }
    const on = setFrame(A.img, A.ph, A.phn, ci)

    on.style.transition = 'opacity .22s ease, transform 1.7s ease-out'
    on.style.opacity = '1'
    on.style.transform = 'scale(1.0)'

    B.img.style.transition = 'opacity .42s ease'
    B.img.style.opacity = '0'
    B.ph.style.transition = 'opacity .42s ease'
    B.ph.style.opacity = '0'

    ;(on === A.img ? A.ph : A.img).style.opacity = '0'

    void flash // 셔터 플래시는 draw 에서 시간기반으로 그린다(flashStart)
  }

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    g.clearRect(0, 0, fr.w, fr.h)

    const time = fr.t * 1000
    const f = (time % CYCLE) / CYCLE

    let ci = 0
    for (let k = 0; k < N; k++) {
      if (f >= CUM[k]) ci = k
    }
    if (ci !== lastCut.current && f < ACCEL_END) {
      lastCut.current = ci
      showCut(ci)
      warmPhotos(ci + 1)
      flashStart.current = fr.t // 컷마다 셔터 플래시 재점화
    }

    // 셔터 플래시 — 컷 직후 0.5에서 .26s 동안 0으로 감쇠(영사기 셔터)
    const flash = flashRef.current
    if (flash) {
      const age = fr.t - flashStart.current
      flash.style.opacity = flashStart.current >= 0 && age >= 0 && age < 0.26 ? (0.5 * (1 - age / 0.26)).toFixed(3) : '0'
    }

    const hv = clamp((f - 0.6) / 0.1, 0, 1)
    const hOut = clamp((f - 0.94) / 0.05, 0, 1)
    const appear = ease(hv) * (1 - hOut)
    const hb = (1 - ease(hv)) * 7 + hOut * 5

    const headline = headlineRef.current
    if (headline) {
      headline.style.opacity = appear.toFixed(3)
      headline.style.filter = hb > 0.05 ? `blur(${hb.toFixed(2)}px)` : 'none'
      headline.style.transform = `scale(${(1.1 - 0.1 * ease(hv)).toFixed(3)})`
    }
    if (subRef.current) subRef.current.style.opacity = (appear * 0.9).toFixed(3)
  }, { running })

  return (
    <SceneHost
      className={s.stage}
      bg="#050505"
      overlay={{
        scan: { bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0 2px, rgba(0, 0, 0, 0.26) 3px 4px)', z: 30 },
        vignette: { bg: 'radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(0, 0, 0, 0.72) 100%)', z: 31, opacity: 0.7 },
        grain: { opacity: 0.12, z: 32 },
      }}
    >
      <canvas ref={ref} className={s.c} />

      <div className={s.slide} ref={slideARef} />
      <div className={s.slide} ref={slideBRef} />
      <div className={s.ph} ref={phARef}>
        <span className={s.pn} ref={phAnRef}>
          01
        </span>
      </div>
      <div className={s.ph} ref={phBRef}>
        <span className={s.pn} ref={phBnRef}>
          02
        </span>
      </div>

      <div className={s.wash} />
      <div className={s.washacc} />
      {/* scan·vignette·grain 은 SceneHost overlay prop 으로 통합(공통 오버레이) */}
      <div className={s.flash} ref={flashRef} />

      <div className={s.eyebrow}>
        <b>SCENE 01</b> · {english ? 'ERA' : '시대'} — THE ACCELERATION
      </div>

      <div className={s.center}>
        <div className={`${s.headline} ${s.kr}`} ref={headlineRef}>
          {english ? <>The world is <span className={s.fast}>changing fast.</span></> : <>시대는 <span className={s.fast}>빠르게</span> 변하고 있습니다</>}
        </div>
        <div className={s.sub} ref={subRef}>
          THE ERA IS CHANGING <b>— FASTER EVERY DAY</b>
        </div>
      </div>

      <div className={`${s.rate} ${s.kr}`}>
        {english ? <>Rate of change · <b>acceleration</b> — RATE OF CHANGE</> : <>변화의 속도 · <b>가속</b> — RATE OF CHANGE</>}
      </div>
    </SceneHost>
  )
}
