'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════
   SCENE · SYS-BIOS // POWER-ON SELF-TEST (05-bios-boot.html 이식)
   DOM-animation 씬 — canvas 없음. CSS 애니메이션 + imperative DOM.
   useSceneCanvas 불필요: 타이머 기반 시퀀스를 useEffect 로 관리.
   ════════════════════════════════════════════════════════════════ */

/* POST checklist */
interface PostItem {
  t?: string
  s?: string
  tag?: number
  mem?: boolean
}
const POST: PostItem[] = [
  { t: 'Initializing SYS-BIOS Power-On Self-Test ...', s: 'dim' },
  { t: 'CMOS Checksum ................. valid', s: 'dim' },
  { t: 'Detecting HumanCore™ Processor . online', s: 'ok' },
  { mem: true },
  { t: 'PCI Bus enumeration .......... 7 devices', s: 'ok', tag: 1 },
  { t: 'Storage controller ........... attached', s: 'ok', tag: 1 },
  { t: 'System clock ................. synchronized', s: 'ok', tag: 1 },
  { t: 'Display adapter .............. CRT 1280x720', s: 'ok', tag: 1 },
  { t: 'Loading firmware modules ..... mounted', s: 'ok', tag: 1 },
  { t: 'Verifying boot signature ..... v04.18', s: 'ok', tag: 1 },
  { t: 'Handing off to system shell .. ready', s: 'ok' },
]

const LOGO = [
  ' ____   _   _ _   _ ',
  '|  _ \\ | | | | | | |   S Y S T E M',
  '| |_) || | | | |_| |   F I R M W A R E',
  '|  __/ | |_| |  _  |   v04.18  ONLINE',
  '|_|     \\___/|_| |_|   SYS-BIOS  CORE',
]

/* POST log lines are built as DOM nodes (text + styled spans), not HTML strings. */
function span(className: string, ...children: (string | Node)[]) {
  const el = document.createElement('span')
  el.className = className
  el.append(...children)
  return el
}

function fillPostLine(ln: HTMLElement, item: (typeof POST)[number]) {
  ln.textContent = item.t ?? ''
  if (item.tag) ln.append(' ', span(s.tagOk, '[ OK ]'))
}

function fillMemLine(ln: HTMLElement, mb: string) {
  ln.replaceChildren(span(s.membar, 'Memory Test : ', span(s.membarFill, mb), ' MB OK'))
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const screenRef = useRef<HTMLDivElement | null>(null)
  const flashRef = useRef<HTMLDivElement | null>(null)
  const logoRef = useRef<HTMLPreElement | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLElement | null>(null)
  const pctRef = useRef<HTMLSpanElement | null>(null)
  const statRef = useRef<HTMLSpanElement | null>(null)
  const readyRef = useRef<HTMLDivElement | null>(null)

  useSceneReady(onReady)

  useEffect(() => {
    if (!running) return

    let done = false
    const timers: ReturnType<typeof setTimeout>[] = []

    function setProg(p: number) {
      p = Math.min(100, Math.round(p))
      if (barRef.current) barRef.current.style.width = p + '%'
      if (pctRef.current) pctRef.current.textContent = String(p).padStart(2, '0') + '%'
    }

    function typeLogo(cb: () => void) {
      let i = 0
      ;(function step() {
        if (done) return
        if (logoRef.current) logoRef.current.textContent = LOGO.slice(0, i + 1).join('\n')
        i++
        if (i < LOGO.length) {
          timers.push(setTimeout(step, 60))
        } else {
          timers.push(setTimeout(cb, 150))
        }
      })()
    }

    function memCount(lineEl: HTMLElement, cb: () => void) {
      const TARGET = 2048
      let v = 0
      const step = () => {
        if (done) return
        v += Math.max(1, Math.round((TARGET - v) / 5))
        if (v >= TARGET) v = TARGET
        fillMemLine(lineEl, String(v).padStart(4, ' '))
        if (v < TARGET) {
          timers.push(setTimeout(step, 22))
        } else {
          timers.push(setTimeout(cb, 200))
        }
      }
      step()
    }

    function finishBoot() {
      if (done) return
      done = true
      setProg(100)
      if (statRef.current) statRef.current.textContent = 'READY'
      if (readyRef.current) {
        readyRef.current.classList.remove(s.readylineOn)
        void readyRef.current.offsetWidth
        readyRef.current.classList.add(s.readylineOn)
      }
      const fl = flashRef.current
      if (fl) {
        fl.classList.remove(s.flashPoweron, s.flashReady)
        void fl.offsetWidth
        fl.classList.add(s.flashReady)
      }
    }

    function runBoot() {
      typeLogo(() => {
        let idx = 0
        const total = POST.length
        const next = () => {
          if (done) return
          if (idx >= total) {
            setProg(100)
            timers.push(setTimeout(finishBoot, 360))
            return
          }
          const item = POST[idx]
          setProg(6 + (idx / total) * 94)

          if (item.mem) {
            const ln = document.createElement('div')
            ln.className = s.line
            logRef.current?.appendChild(ln)
            memCount(ln, () => {
              idx++
              next()
            })
            return
          }

          const ln = document.createElement('div')
          ln.className = s.line + ' ' + (item.s === 'ok' ? s.ok : s.dim)
          fillPostLine(ln, item)
          logRef.current?.appendChild(ln)
          idx++
          timers.push(setTimeout(next, 185))
        }
        next()
      })
    }

    function showReadyStatic() {
      done = true
      if (screenRef.current) screenRef.current.style.opacity = '1'
      if (logoRef.current) logoRef.current.textContent = LOGO.join('\n')
      if (logRef.current) {
        logRef.current.replaceChildren()
        POST.forEach((item) => {
          const ln = document.createElement('div')
          if (item.mem) {
            ln.className = s.line
            fillMemLine(ln, '2048')
          } else {
            ln.className = s.line + ' ' + (item.s === 'ok' ? s.ok : s.dim)
            fillPostLine(ln, item)
          }
          logRef.current?.appendChild(ln)
        })
      }
      setProg(100)
      if (statRef.current) statRef.current.textContent = 'READY'
      if (readyRef.current) readyRef.current.style.opacity = '1'
    }

    function startAnim() {
      const fl = flashRef.current
      if (fl) {
        fl.classList.remove(s.flashPoweron, s.flashReady)
        void fl.offsetWidth
        fl.classList.add(s.flashPoweron)
      }
      if (screenRef.current) {
        screenRef.current.classList.remove(s.screenLit)
        void screenRef.current.offsetWidth
        screenRef.current.classList.add(s.screenLit)
      }
      timers.push(setTimeout(runBoot, 280))
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      showReadyStatic()
    } else {
      startAnim()
    }

    return () => {
      done = true
      timers.forEach(clearTimeout)
    }
  }, [running])

  return (
    <SceneHost bg="#050505">
      <div className={s.crt}>
        <div ref={flashRef} className={s.flash} />
        <div ref={screenRef} className={s.screen}>
          <div className={s.boot}>
            <div className={s.banner}>
              <div>
                <div className={s.vend}>
                  <b>SYS</b>-BIOS &nbsp; Core Microsystems
                </div>
                <div className={s.dim}>
                  Firmware Rev. 04.18 &nbsp;|&nbsp; HumanCore&trade; x1 @ 3.6GHz &nbsp;|&nbsp; (C) 2025
                </div>
              </div>
              <div className={s.meta}>
                POWER-ON SELF-TEST
                <br />
                SERIAL 0xENG-OPS-SYS
              </div>
            </div>

            <pre ref={logoRef} className={s.asciiLogo} />

            <div ref={logRef} className={s.bootlog} />

            <div ref={readyRef} className={s.readyline}>
              SYSTEM READY<span className={s.cur} />
            </div>

            <div className={s.bootfoot}>
              <span ref={statRef} className={s.stat}>
                POST
              </span>
              <div className={s.prog}>
                <i ref={barRef} className={s.progInner} />
              </div>
              <span ref={pctRef}>00%</span>
            </div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
