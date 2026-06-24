import type { Frame } from '../_host/types'
import { LEDGER } from './data'
import { buildWaterfallSvg, buildScopeSvg, buildGaugeSvg, setGauge } from './draw'
import { BOOT, STEP, END_HOLD, ROW_SCAN, LAND_SHORT, WALK_CYCLE, easeOutCubic, easeIO } from './constants'
import type { WfBar, DigitRoll, ScopeParts, GaugeParts } from './types'
import type { SceneViewRefs } from './view'
import s from './scene.module.css'

type RuntimeRefs = Omit<SceneViewRefs, 'canvasRef'>

export interface InstrumentRackRuntime {
  selectLedger: (i: number) => void
  setupDom: () => void
  setupReducedMotion: () => () => void
  tick: (f: Frame) => void
}

export function createRuntime(refs: RuntimeRefs): InstrumentRackRuntime {
  const digitRolls = { current: [] as DigitRoll[] }
  const wfBars = { current: [] as WfBar[] }
  const scopeRef = { current: null as ScopeParts | null }
  const gaugeRef = { current: null as GaugeParts | null }
  const walkingRef = { current: true }
  const activeLedgerRef = { current: -1 }
  const reducedRef = { current: false }

  const showInterro = (i: number) => {
    const item = LEDGER[i]
    if (!item) return
    if (activeLedgerRef.current !== i) {
      refs.rowRefs.current.forEach((el, j) => el?.classList.toggle(s.active, j === i))
      activeLedgerRef.current = i
    }
    if (refs.qRef.current && refs.qRef.current.textContent !== item.q) refs.qRef.current.textContent = item.q
    if (refs.aRef.current && refs.aRef.current.innerHTML !== item.a) refs.aRef.current.innerHTML = item.a
    if (refs.levRef.current && refs.levRef.current.textContent !== item.lever) refs.levRef.current.textContent = item.lever
    const idx = `항목 ${String(i + 1).padStart(2, '0')} / ${String(LEDGER.length).padStart(2, '0')}`
    if (refs.idxRef.current && refs.idxRef.current.textContent !== idx) refs.idxRef.current.textContent = idx
  }

  const selectLedger = (i: number) => {
    walkingRef.current = false
    refs.rowRefs.current.forEach((el) => el?.classList.remove(s.scan))
    refs.ledTotalRef.current?.classList.remove(s.land)
    refs.dmmWinRef.current?.classList.remove(s.land)
    refs.surgeDotRef.current?.classList.remove(s.surge)
    refs.finalStepRef.current?.classList.remove(s.land)
    showInterro(i)
  }

  const setupReducedMotion = () => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      reducedRef.current = mq.matches
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }

  const setupDom = () => {
    const wfSvg = refs.wfSvgRef.current
    const scopeSvg = refs.scopeSvgRef.current
    const gaugeSvg = refs.gaugeSvgRef.current
    if (wfSvg) buildWaterfallSvg(wfSvg, wfBars)
    if (scopeSvg) buildScopeSvg(scopeSvg, scopeRef)
    if (gaugeSvg) buildGaugeSvg(gaugeSvg, gaugeRef)

    digitRolls.current = refs.digitRefs.current.flatMap((el) => {
      if (!el) return []
      const target = Number(el.dataset.d ?? '0')
      const col = document.createElement('div')
      col.className = s.col
      const seq = Array.from({ length: 10 }, (_, n) => n).concat(target)
      seq.forEach((n) => {
        const span = document.createElement('span')
        span.textContent = String(n)
        col.appendChild(span)
      })
      el.replaceChildren(col)
      return [{ el, col, target }]
    })

    showInterro(0)
  }

  const tick = (f: Frame) => {
    const now = f.t * 1000
    const reduce = reducedRef.current

    if (walkingRef.current) {
      if (reduce || now < BOOT) {
        showInterro(0)
        refs.rowRefs.current.forEach((el) => el?.classList.remove(s.scan))
        refs.ledTotalRef.current?.classList.remove(s.land)
        refs.dmmWinRef.current?.classList.remove(s.land)
        refs.surgeDotRef.current?.classList.remove(s.surge)
        refs.finalStepRef.current?.classList.remove(s.land)
      } else {
        const local = (now - BOOT) % WALK_CYCLE
        const walkSpan = LEDGER.length * STEP
        const inRows = local < walkSpan
        const idx = inRows ? Math.floor(local / STEP) : LEDGER.length - 1
        const rowPhase = local % STEP
        showInterro(idx)
        refs.rowRefs.current.forEach((el, j) => {
          el?.classList.toggle(s.scan, inRows && j === idx && rowPhase < ROW_SCAN)
        })
        const climaxElapsed = local - walkSpan
        const shortLand = !inRows && climaxElapsed < LAND_SHORT
        const ledLand = !inRows && climaxElapsed < END_HOLD + 1100
        refs.ledTotalRef.current?.classList.toggle(s.land, ledLand)
        refs.dmmWinRef.current?.classList.toggle(s.land, shortLand)
        refs.surgeDotRef.current?.classList.toggle(s.surge, shortLand)
        refs.finalStepRef.current?.classList.toggle(s.land, shortLand)
      }
    }

    if (wfBars.current.length) {
      const FILL = 520
      const STAG = 230
      const HOLD = 2600
      const cycle = wfBars.current.length * STAG + FILL + HOLD
      const p = now % cycle
      wfBars.current.forEach((bar, i) => {
        const k = reduce ? 1 : easeOutCubic((p - i * STAG) / FILL)
        const curY = bar.yBot + (bar.yTop - bar.yBot) * k
        const curH = Math.max(0.5, bar.yBot - curY)
        bar.rect.setAttribute('y', curY.toFixed(1))
        bar.rect.setAttribute('height', curH.toFixed(1))
      })
    }

    digitRolls.current.forEach((digit, idx) => {
      if (reduce) {
        digit.col.style.transform = `translateY(-${digit.target}em)`
        return
      }
      const ROLL = 900
      const HOLD = 2200
      const cycle = ROLL + HOLD
      const off = idx * 120
      const p = (((now - off) % cycle) + cycle) % cycle
      let em: number
      if (p < ROLL) {
        const k = easeOutCubic(p / ROLL)
        const total = 2 * 10 + digit.target
        em = (total * k) % 10
        if (p / ROLL > 0.985) em = digit.target
      } else {
        em = digit.target
      }
      digit.col.style.transform = `translateY(-${em.toFixed(3)}em)`
    })

    const scope = scopeRef.current
    if (scope) {
      const W = 360
      const levels = [100, 73, 51, 27, 15]
      const yOf = (v: number) => {
        const t = (v - 15) / (100 - 15)
        return 128 - t * (128 - 18)
      }
      const curveY = (fx: number) => {
        const seg = fx * (levels.length - 1)
        const i = Math.min(levels.length - 2, Math.floor(seg))
        const local = seg - i
        const e = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, local * 1.2))
        const v = levels[i] + (levels[i + 1] - levels[i]) * e
        return yOf(v)
      }
      if (reduce) {
        scope.trace.setAttribute('stroke-dashoffset', '0')
        scope.dot.setAttribute('cx', String(W))
        scope.dot.setAttribute('cy', curveY(1).toFixed(1))
        scope.dot.setAttribute('opacity', '1')
      } else {
        const SWEEP = 2600
        const GAP = 900
        const cyc = SWEEP + GAP
        const p = (now % cyc) / SWEEP
        const k = Math.min(1, p)
        scope.trace.setAttribute('stroke-dashoffset', (scope.len * (1 - k)).toFixed(1))
        scope.dot.setAttribute('cx', (k * W).toFixed(1))
        scope.dot.setAttribute('cy', curveY(k).toFixed(1))
        scope.dot.setAttribute('opacity', p <= 1 ? '1' : '0.0')
      }
    }

    const gauge = gaugeRef.current
    if (gauge) {
      if (reduce) {
        setGauge(gauge, 15)
      } else {
        const DROP = 2200
        const HOLD = 2400
        const cyc = DROP + HOLD
        const p = now % cyc
        setGauge(gauge, p < DROP ? 100 - (100 - 15) * easeIO(p / DROP) : 15)
      }
    }
  }

  return { selectLedger, setupDom, setupReducedMotion, tick }
}
