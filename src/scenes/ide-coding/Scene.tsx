'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { cx } from '../_host/dom-util'
import type { Frame, SceneProps } from '../_host/types'
import { SRC, TERM, type TerminalEvent } from './data'
import s from './scene.module.css'

// 39 · IDE / Source Editor — deterministic live-coding loop.

type TokenClass = 'kw' | 'st' | 'fn' | 'ty' | 'nm' | 'pu' | 'cm' | 'id' | 'ws'
type Token = { c: TokenClass; s: string }
type Phase = 'type' | 'save' | 'term' | 'hold' | 'reset'

type Runtime = {
  typed: number
  pause: number
  lastFlatIdx: number
  lastTypedInt: number
  curLine: number
  curCol: number
  phase: Phase
  pTimer: number
  ti: number
  tWait: number
  tCmdChars: number
  tCmdLineMade: boolean
  elapsed: number
  initialized: boolean
}

const KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'of',
  'in',
  'new',
  'type',
  'as',
  'await',
  'async',
  'void',
  'null',
  'undefined',
  'true',
  'false',
  'this',
])

const LH = 22
const CPS = 70
const MM_LINE_H = 3.0
const SYN_COL: Record<Exclude<TokenClass, 'ws'>, string> = {
  kw: '#5fa8a2',
  st: '#c4a062',
  fn: '#cdd5de',
  ty: '#86a7b8',
  nm: '#9bb6ac',
  pu: '#5b636e',
  cm: '#3f454e',
  id: '#8a92a0',
}

const tokenClass: Record<Exclude<TokenClass, 'ws'>, string> = {
  kw: s.tKw,
  st: s.tSt,
  fn: s.tFn,
  ty: s.tTy,
  nm: s.tNm,
  pu: s.tPu,
  cm: s.tCm,
  id: s.tId,
}

const termClass: Record<string, string> = {
  tdim: s.tdim,
  tfaint: s.tfaint,
  trun: s.trun,
  tpass: s.tpass,
  tok: s.tok,
  tsummary: s.tsummary,
  '': s.tdim,
}

function createRuntime(): Runtime {
  return {
    typed: 0,
    pause: 0,
    lastFlatIdx: 0,
    lastTypedInt: -1,
    curLine: 0,
    curCol: 1,
    phase: 'type',
    pTimer: 0,
    ti: 0,
    tWait: 0,
    tCmdChars: 0,
    tCmdLineMade: false,
    elapsed: 0,
    initialized: false,
  }
}

function tokenizeLine(src: string): Token[] {
  const toks: Token[] = []
  let i = 0
  const n = src.length
  while (i < n) {
    const ch = src[i]
    if (ch === '/' && src[i + 1] === '/') {
      toks.push({ c: 'cm', s: src.slice(i) })
      break
    }
    if (ch === ' ' || ch === '\t') {
      let j = i
      while (j < n && (src[j] === ' ' || src[j] === '\t')) j++
      toks.push({ c: 'ws', s: src.slice(i, j) })
      i = j
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let k = i + 1
      while (k < n && src[k] !== ch) {
        if (src[k] === '\\') k++
        k++
      }
      k++
      if (k > n) k = n
      toks.push({ c: 'st', s: src.slice(i, k) })
      i = k
      continue
    }
    if (ch >= '0' && ch <= '9') {
      let m = i
      while (m < n && ((src[m] >= '0' && src[m] <= '9') || src[m] === '.')) m++
      toks.push({ c: 'nm', s: src.slice(i, m) })
      i = m
      continue
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let p = i
      while (p < n && /[A-Za-z0-9_$]/.test(src[p])) p++
      const w = src.slice(i, p)
      let cls: TokenClass = 'id'
      if (KEYWORDS.has(w)) cls = 'kw'
      else if (/^[A-Z]/.test(w)) cls = 'ty'
      else if (src[p] === '(') cls = 'fn'
      toks.push({ c: cls, s: w })
      i = p
      continue
    }
    toks.push({ c: 'pu', s: ch })
    i++
  }
  return toks
}

function lineLen(line: Token[]) {
  let t = 0
  for (let i = 0; i < line.length; i++) t += line[i].s.length
  return t
}

const LINES = SRC.map(tokenizeLine)
const LLEN = LINES.map(lineLen)
const FLAT = SRC.join('\n')
const TOTAL = FLAT.length

function esc(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function tokHTML(toks: Token[]) {
  let h = ''
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.c === 'ws') h += t.s
    else h += `<span class="${tokenClass[t.c]}">${esc(t.s)}</span>`
  }
  return h
}

function partialToks(line: Token[], k: number) {
  const out: Token[] = []
  let rem = k
  for (let i = 0; i < line.length; i++) {
    if (rem <= 0) break
    const t = line[i]
    if (t.s.length <= rem) {
      out.push(t)
      rem -= t.s.length
    } else {
      out.push({ c: t.c, s: t.s.slice(0, rem) })
      rem = 0
      break
    }
  }
  return out
}

function fmtUp(sec: number) {
  const m = Math.floor(sec / 60)
  const ss = Math.floor(sec % 60)
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
}

function isCommand(ev: TerminalEvent): ev is Extract<TerminalEvent, { cmd: string }> {
  return 'cmd' in ev
}

export default function Scene({ running = true, onReady }: SceneProps) {
  useSceneReady(onReady)
  const runtime = useRef(createRuntime())
  const codeflowRef = useRef<HTMLDivElement | null>(null)
  const edwrapRef = useRef<HTMLDivElement | null>(null)
  const termbodyRef = useRef<HTMLDivElement | null>(null)
  const mmViewRef = useRef<HTMLDivElement | null>(null)
  const branchModRef = useRef<HTMLSpanElement | null>(null)
  const errCountRef = useRef<HTMLSpanElement | null>(null)
  const warnCountRef = useRef<HTMLSpanElement | null>(null)
  const buildSpinRef = useRef<HTMLSpanElement | null>(null)
  const buildLabelRef = useRef<HTMLSpanElement | null>(null)
  const lncolRef = useRef<HTMLDivElement | null>(null)
  const probBadgeRef = useRef<HTMLSpanElement | null>(null)
  const tabRef = useRef<HTMLDivElement | null>(null)
  const centerRef = useRef<HTMLDivElement | null>(null)
  const uptimeRef = useRef<HTMLSpanElement | null>(null)

  function rowHTML(li: number, inner: string, active: boolean) {
    return `<div class="${cx(s.row, active && s.active)}"><span class="${s.gut}">${li + 1}</span><span class="${s.code}">${inner}</span></div>`
  }

  function updateScroll() {
    const flow = codeflowRef.current
    const edwrap = edwrapRef.current
    if (!flow || !edwrap) return
    const st = runtime.current
    const vh = edwrap.clientHeight
    const visLines = Math.floor(vh / LH)
    let off = 0
    if (st.curLine > visLines - 5) off = (st.curLine - (visLines - 5)) * LH
    flow.style.transform = `translateY(${-off}px)`
  }

  function renderEditor(nChars: number) {
    const flow = codeflowRef.current
    if (!flow) return
    const st = runtime.current
    const ni = Math.floor(nChars)
    if (ni === st.lastTypedInt) return
    st.lastTypedInt = ni
    let remaining = ni
    let html = ''
    let cursorPlaced = false
    st.curLine = 0
    st.curCol = 1

    for (let li = 0; li < LINES.length; li++) {
      const llen = LLEN[li]
      const isLast = li === LINES.length - 1
      const withNl = llen + (isLast ? 0 : 1)
      if (remaining >= withNl) {
        html += rowHTML(li, tokHTML(LINES[li]), false)
        remaining -= withNl
        st.curLine = li + 1
        st.curCol = 1
      } else {
        const rev = Math.min(remaining, llen)
        html += rowHTML(li, tokHTML(partialToks(LINES[li], rev)) + `<span class="${s.caret}"></span>`, true)
        cursorPlaced = true
        st.curLine = li
        st.curCol = rev + 1
        break
      }
    }

    if (!cursorPlaced) {
      st.curLine = LINES.length - 1
      st.curCol = LLEN[st.curLine] + 1
    }

    flow.innerHTML = html
    updateScroll()
  }

  function updateLnCol() {
    const st = runtime.current
    if (lncolRef.current) lncolRef.current.textContent = `Ln ${st.curLine + 1}, Col ${st.curCol}`
  }

  function termClear() {
    const termbody = termbodyRef.current
    if (termbody) termbody.innerHTML = ''
  }

  function termAppend(html: string) {
    const termbody = termbodyRef.current
    if (!termbody) return
    const d = document.createElement('div')
    d.className = s.tl
    d.innerHTML = html
    termbody.appendChild(d)
    while (termbody.children.length > 13 && termbody.firstChild) {
      termbody.removeChild(termbody.firstChild)
    }
  }

  function termUpdateLast(html: string) {
    const last = termbodyRef.current?.lastElementChild
    if (last) last.innerHTML = html
  }

  function commandLine(cmd: string, caret: boolean) {
    return `<span class="${s.tpromptSym}">$</span> <span class="${s.tcmd}">${esc(cmd)}</span>${caret ? `<span class="${s.tcaret}"></span>` : ''}`
  }

  function setTyping() {
    if (buildSpinRef.current) buildSpinRef.current.style.display = 'inline-block'
    if (buildLabelRef.current) buildLabelRef.current.textContent = 'checking · tsserver'
    if (errCountRef.current) errCountRef.current.textContent = '2'
    if (warnCountRef.current) warnCountRef.current.textContent = '1'
    if (probBadgeRef.current) probBadgeRef.current.textContent = '3'
    tabRef.current?.classList.add(s.dirty)
    if (branchModRef.current) branchModRef.current.style.display = ''
  }

  function setPassed() {
    if (buildSpinRef.current) buildSpinRef.current.style.display = 'none'
    if (buildLabelRef.current) buildLabelRef.current.textContent = 'no problems'
    if (errCountRef.current) errCountRef.current.textContent = '0'
    if (warnCountRef.current) warnCountRef.current.textContent = '0'
    if (probBadgeRef.current) probBadgeRef.current.textContent = '0'
    tabRef.current?.classList.remove(s.dirty)
  }

  function resetLoop() {
    const st = runtime.current
    st.typed = 0
    st.pause = 0
    st.lastFlatIdx = 0
    st.lastTypedInt = -1
    st.ti = 0
    st.tWait = 0
    st.tCmdChars = 0
    st.tCmdLineMade = false
    termClear()
    renderEditor(0)
    setTyping()
  }

  function tickTerm(dt: number) {
    const st = runtime.current
    if (st.ti >= TERM.length) {
      st.phase = 'hold'
      st.pTimer = 0
      return
    }

    const ev: TerminalEvent = TERM[st.ti]
    if (isCommand(ev)) {
      if (!st.tCmdLineMade) {
        st.tCmdLineMade = true
        st.tCmdChars = 0
        termAppend(commandLine('', true))
      }
      st.tCmdChars += dt * 40
      const shown = Math.min(ev.cmd.length, Math.floor(st.tCmdChars))
      termUpdateLast(commandLine(ev.cmd.slice(0, shown), true))
      if (shown >= ev.cmd.length) {
        st.tWait += dt * 1000
        if (st.tWait >= ev.after) {
          termUpdateLast(commandLine(ev.cmd, false))
          st.ti++
          st.tWait = 0
          st.tCmdLineMade = false
          if (buildSpinRef.current) buildSpinRef.current.style.display = 'inline-block'
          if (buildLabelRef.current) buildLabelRef.current.textContent = 'vitest · running'
        }
      }
      return
    }

    st.tWait += dt * 1000
    if (st.tWait >= ev.after) {
      const cls = termClass[ev.cls] ?? s.tdim
      termAppend(`<span class="${cls}">${esc(ev.t)}</span>`)
      st.tWait = 0
      st.ti++
      if (st.ti >= TERM.length) {
        if (buildSpinRef.current) buildSpinRef.current.style.display = 'none'
        if (buildLabelRef.current) buildLabelRef.current.textContent = 'build passed · 0 errors'
      }
    }
  }

  function drawMinimap(g: CanvasRenderingContext2D, W: number, H: number) {
    g.clearRect(0, 0, W, H)
    if (W <= 0 || H <= 0) return
    const st = runtime.current
    const pad = 6
    const cw = 0.82
    const x0 = pad
    for (let li = 0; li <= st.curLine && li < LINES.length; li++) {
      const y = pad + li * MM_LINE_H
      if (y > H - pad) break
      let x = x0
      const toks = LINES[li]
      for (let ti = 0; ti < toks.length; ti++) {
        const t = toks[ti]
        const wpx = t.s.length * cw
        if (t.c !== 'ws') {
          g.fillStyle = SYN_COL[t.c] || '#7a828d'
          g.globalAlpha = li === st.curLine ? 0.95 : 0.6
          g.fillRect(x, y, wpx, 1.6)
        }
        x += wpx
        if (x > W - pad) break
      }
    }
    g.globalAlpha = 1

    const edwrap = edwrapRef.current
    const view = mmViewRef.current
    if (!edwrap || !view) return
    const vh = edwrap.clientHeight
    const visLines = Math.floor(vh / LH)
    const topLine = Math.max(0, st.curLine - (visLines - 5))
    const vy = pad + topLine * MM_LINE_H
    const vh2 = visLines * MM_LINE_H
    view.style.top = `${vy}px`
    view.style.height = `${Math.min(vh2, H - vy)}px`
  }

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const st = runtime.current
    if (!st.initialized) {
      resetLoop()
      st.initialized = true
    }

    const dt = Math.min(0.05, fr.dt)
    st.elapsed += dt
    if (uptimeRef.current) uptimeRef.current.textContent = fmtUp(st.elapsed)

    if (st.phase === 'type') {
      if (st.pause > 0) {
        st.pause -= dt
      } else {
        st.typed += dt * CPS
        const idx = Math.floor(st.typed)
        if (idx > st.lastFlatIdx) {
          const c = FLAT[idx - 1]
          st.lastFlatIdx = idx
          if (c === '\n') st.pause = 0.062
          else if (c === ';' || c === '{') st.pause = 0.038
          else if (c === '}' || c === ')') st.pause = 0.02
          else if (c === ',' || c === '=') st.pause = 0.012
        }
        if (st.typed >= TOTAL) {
          st.typed = TOTAL
          renderEditor(TOTAL)
          st.phase = 'save'
          st.pTimer = 0
        } else {
          renderEditor(st.typed)
          updateLnCol()
        }
      }
    } else if (st.phase === 'save') {
      st.pTimer += dt
      if (st.pTimer > 0.2 && buildLabelRef.current && !buildLabelRef.current.textContent?.includes('format')) {
        buildLabelRef.current.textContent = 'formatting · saving'
      }
      if (st.pTimer > 0.85) {
        setPassed()
        st.phase = 'term'
        st.tWait = 0
        st.ti = 0
        st.tCmdChars = 0
        st.tCmdLineMade = false
      }
    } else if (st.phase === 'term') {
      tickTerm(dt)
    } else if (st.phase === 'hold') {
      st.pTimer += dt
      if (st.pTimer > 2.4) {
        st.phase = 'reset'
        st.pTimer = 0
        centerRef.current?.classList.add(s.dimOut)
      }
    } else if (st.phase === 'reset') {
      st.pTimer += dt
      if (st.pTimer > 0.75) {
        resetLoop()
        centerRef.current?.classList.remove(s.dimOut)
        st.phase = 'type'
      }
    }

    drawMinimap(g, fr.w, fr.h)
  }, { running })

  return (
    <SceneHost className={s.root} bg="#0c0d10">
      <div className={s.app}>
        <div className={s.titlebar}>
          <div className={s.traffic}>
            <i />
            <i />
            <i />
          </div>
          <div className={s.menu}>
            <span>File</span>
            <span>Edit</span>
            <span>View</span>
            <span>Go</span>
            <span>Run</span>
            <span>Terminal</span>
          </div>
          <div className={s.titlecenter}>
            <b>useAnomalyGuard.ts</b> &nbsp;—&nbsp; workspace
          </div>
          <div className={s.titleright}>
            <span className={s.livedot}>
              <i />
              LIVE BUILD
            </span>
            <span ref={uptimeRef}>00:00</span>
          </div>
        </div>

        <div className={s.body}>
          <div className={s.activity}>
            <div className={cx(s.act, s.on)} title="Explorer">
              &#9783;
            </div>
            <div className={s.act} title="Search">
              &#9906;
            </div>
            <div className={s.act} title="Source Control">
              &#9881;
            </div>
            <div className={s.act} title="Run &amp; Debug">
              &#9655;
            </div>
            <div className={s.act} title="Extensions">
              &#9638;
            </div>
            <div className={cx(s.act, s.bottom)} title="Account">
              &#9737;
            </div>
            <div className={s.act} title="Settings">
              &#9881;
            </div>
          </div>

          <div className={s.sidebar}>
            <div className={s.sbHead}>
              <span>Explorer</span>
              <span className={s.dots}>&#8943;</span>
            </div>
            <div className={s.tree}>
              <div className={cx(s.tr, s.dir)}><span className={s.tw}>&#9662;</span><span className={s.ico}>&#9698;</span>workspace</div>
              <div className={cx(s.tr, s.dir, s.ind1)}><span className={s.tw}>&#9662;</span><span className={s.ico}>&#9698;</span>src</div>
              <div className={cx(s.tr, s.dir, s.ind2)}><span className={s.tw}>&#9662;</span><span className={s.ico}>&#9698;</span>hooks</div>
              <div className={cx(s.tr, s.file, s.active, s.ind2, s.filePad)}><span className={s.ico}>&#9670;</span>useAnomalyGuard.ts<span className={s.mod}>&#9679;</span></div>
              <div className={cx(s.tr, s.file, s.ind2, s.filePad)}><span className={s.ico}>&#9670;</span>useTelemetry.ts</div>
              <div className={cx(s.tr, s.dir, s.ind1)}><span className={s.tw}>&#9656;</span><span className={s.ico}>&#9697;</span>components</div>
              <div className={cx(s.tr, s.dir, s.ind1)}><span className={s.tw}>&#9662;</span><span className={s.ico}>&#9698;</span>lib</div>
              <div className={cx(s.tr, s.file, s.ind2, s.filePad)}><span className={s.ico}>&#9670;</span>stream.ts</div>
              <div className={cx(s.tr, s.file, s.ind2, s.filePad)}><span className={s.ico}>&#9670;</span>schema.ts</div>
              <div className={cx(s.tr, s.file, s.ind1)}><span className={s.ico}>&#9670;</span>app.tsx</div>
              <div className={cx(s.tr, s.dir)}><span className={s.tw}>&#9662;</span><span className={s.ico}>&#9698;</span>tests</div>
              <div className={cx(s.tr, s.file, s.ind1)}><span className={s.ico}>&#9670;</span>anomaly.test.ts<span className={s.add}>+</span></div>
              <div className={cx(s.tr, s.file)}><span className={s.ico}>&#9671;</span>package.json</div>
              <div className={cx(s.tr, s.file)}><span className={s.ico}>&#9671;</span>tsconfig.json</div>
              <div className={cx(s.tr, s.file)}><span className={s.ico}>&#9671;</span>vitest.config.ts</div>
            </div>
            <div className={s.sbFoot}>
              <div className={s.row}><span>OUTLINE</span><span className={s.dots}>&#8943;</span></div>
              <div className={s.row}><b>&#402; useAnomalyGuard</b><span>hook</span></div>
              <div className={s.row}><b>&nbsp;&nbsp;&#9656; WINDOW · SIGMA</b><span>const</span></div>
            </div>
          </div>

          <div className={s.center} ref={centerRef}>
            <div className={s.tabs}>
              <div className={cx(s.tab, s.on, s.dirty)} ref={tabRef}>
                <span className={s.ico}>&#9670;</span>useAnomalyGuard.ts
                <span className={s.st}><span className={s.dot} /><span className={s.x}>&#10005;</span></span>
              </div>
              <div className={s.tab}><span className={s.ico}>&#9670;</span>stream.ts<span className={s.st}><span className={cx(s.x, s.xVisible)}>&#10005;</span></span></div>
              <div className={s.tab}><span className={s.ico}>&#9670;</span>anomaly.test.ts<span className={s.st}><span className={cx(s.x, s.xVisible)}>&#10005;</span></span></div>
              <div className={s.tab}><span className={s.ico}>&#9671;</span>schema.ts<span className={s.st}><span className={cx(s.x, s.xVisible)}>&#10005;</span></span></div>
            </div>

            <div className={s.crumb}>
              <span className={s.sym}>&#9698;</span><span>src</span><span className={s.sep}>&#8250;</span>
              <span>hooks</span><span className={s.sep}>&#8250;</span>
              <span className={s.sym}>&#9670;</span><span>useAnomalyGuard.ts</span><span className={s.sep}>&#8250;</span>
              <span className={s.cur}>&#402; useAnomalyGuard</span>
            </div>

            <div className={s.edwrap} ref={edwrapRef}>
              <div className={s.codeflow} ref={codeflowRef} />
              <div className={s.minimap}>
                <canvas ref={ref} className={s.c} />
                <div className={s.mmview} ref={mmViewRef} />
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.ptabs}>
                <div className={s.ptab}>Problems <span className={cx(s.badge, s.err)} ref={probBadgeRef}>0</span></div>
                <div className={cx(s.ptab, s.on)}>Terminal</div>
                <div className={s.ptab}>Output</div>
                <div className={s.ptab}>Debug Console</div>
                <div className={s.pright}><span className={s.sh}>zsh</span><span>—</span><span>workspace</span><span>&#9633;</span></div>
              </div>
              <div className={s.termbody} ref={termbodyRef} />
            </div>
          </div>
        </div>

        <div className={s.status}>
          <div className={s.stL}>
            <div className={cx(s.si, s.acc)}><span className={s.g}>&#9095;</span><span>main</span><span ref={branchModRef}>*</span></div>
            <div className={s.si}><span className={s.g}>&#8645;</span><span>2</span>&nbsp;<span>0</span></div>
            <div className={s.si}><span className={s.err}>&#9679;</span><span ref={errCountRef}>0</span>&nbsp;&nbsp;<span className={s.g}>&#9888;</span><span ref={warnCountRef}>0</span></div>
            <div className={s.si}><span className={s.spin} ref={buildSpinRef} style={{ display: 'none' }}>&#9696;</span><span ref={buildLabelRef}>tsserver ready</span></div>
          </div>
          <div className={s.stR}>
            <div className={s.si} ref={lncolRef}>Ln 1, Col 1</div>
            <div className={s.si}>Spaces: 2</div>
            <div className={s.si}>UTF-8</div>
            <div className={s.si}>LF</div>
            <div className={s.si}>TypeScript React</div>
            <div className={s.si}><span className={s.lspdot} />&nbsp;tsserver</div>
            <div className={s.si}>&#9209; Prettier</div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
