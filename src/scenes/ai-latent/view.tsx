'use client'

import type { MutableRefObject, Ref, RefObject } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { KEYS, QTEXT } from './data'
import s from './scene.module.css'

interface AiLatentViewProps {
  canvasRef: Ref<HTMLCanvasElement>
  tpsRef: RefObject<HTMLElement | null>
  tcountRef: RefObject<HTMLElement | null>
  qtextRef: RefObject<HTMLElement | null>
  thinkRef: RefObject<HTMLDivElement | null>
  thinkpctRef: RefObject<HTMLSpanElement | null>
  streamRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
  attnRef: RefObject<HTMLDivElement | null>
  heatRef: RefObject<HTMLDivElement | null>
  attnqRef: RefObject<HTMLSpanElement | null>
  retrRef: RefObject<HTMLDivElement | null>
  rcountRef: RefObject<HTMLElement | null>
  latRef: RefObject<HTMLElement | null>
  seedlineRef: RefObject<HTMLDivElement | null>
  tempValRef: RefObject<HTMLElement | null>
  stynameRef: RefObject<HTMLSpanElement | null>
  tempInputRef: RefObject<HTMLInputElement | null>
  liveLogLineRef: RefObject<HTMLSpanElement | null>
  vsToggleRef: RefObject<HTMLButtonElement | null>
  axmodeRef: RefObject<HTMLSpanElement | null>
  tipRef: RefObject<HTMLDivElement | null>
  tipDomRef: RefObject<HTMLDivElement | null>
  tipLabRef: RefObject<HTMLDivElement | null>
  tipVecRef: RefObject<HTMLDivElement | null>
  latentWrapRef: RefObject<HTMLDivElement | null>
  chipRefs: MutableRefObject<(HTMLButtonElement | null)[]>
  setDimFilter: (value: string | null) => void
}

export function AiLatentView({
  canvasRef,
  tpsRef,
  tcountRef,
  qtextRef,
  thinkRef,
  thinkpctRef,
  streamRef,
  scrollRef,
  attnRef,
  heatRef,
  attnqRef,
  retrRef,
  rcountRef,
  latRef,
  seedlineRef,
  tempValRef,
  stynameRef,
  tempInputRef,
  liveLogLineRef,
  vsToggleRef,
  axmodeRef,
  tipRef,
  tipDomRef,
  tipLabRef,
  tipVecRef,
  latentWrapRef,
  chipRefs,
  setDimFilter,
}: AiLatentViewProps) {

  return (
    <SceneHost className={s.root} bg="#07090d" scroll>
      {/* full-page layout — NOT a canvas-only scene */}
      <div className={s.shell}>

        {/* topbar */}
        <header className={s.topbar}>
          <div className={s.brand}>
            <div className={s.logo} />
            <div className={s.brandMeta}>
              <b>Knowledge Vault</b>
              <span>obsidian · 지식 그래프 · 의미 군집</span>
            </div>
          </div>
          <div className={s.toprite}>
            <div className={s.modeltag}>
              <span className={s.dot} />
              semantic_map.py · BGE-M3 → UMAP → HDBSCAN
            </div>
            <div className={s.stat}><b ref={tpsRef}>0.0</b><span>TOKENS / SEC</span></div>
            <div className={s.stat}><b ref={tcountRef}>0</b><span>TOKENS OUT</span></div>
            <div className={s.stat}><b>28</b><span>LAYERS</span></div>
          </div>
        </header>

        <div className={s.grid}>

          {/* LATENT SPACE */}
          <section className={`${s.card} ${s.latentCard}`}>
            <div className={s.cardH}>
              <div className={s.cardHtt}><span className={s.sq} /> semantic_map.py — 학습 노트의 의미 군집화</div>
              <div>BGE-M3 1024d → UMAP 2d · HDBSCAN</div>
            </div>
            <div className={s.latentWrap} ref={latentWrapRef}>
              <canvas ref={canvasRef} className={s.c} />
              <div className={`${s.retrieving}`} ref={retrRef}>
                <div className={s.bars}><i /><i /><i /><i /></div>
                {' '}retrieving context…
              </div>
              <div className={s.axisNote}>
                UMAP dim_0 →<br />
                ↑ UMAP dim_1<br />
                <span style={{ color: 'var(--ink-2)' }}>hover · 노트 탐색</span><br />
                <span className={s.axmode} ref={axmodeRef}>vector view</span>
              </div>
              <button className={s.vsToggle} ref={vsToggleRef} title="분산 표상(vector) ↔ 기호 표상(symbol) 전환">
                vector ↔ symbol
              </button>
              <div className={s.legend}>
                <div className={s.legendRow} onMouseEnter={() => { setDimFilter('프론트엔드') }} onMouseLeave={() => { setDimFilter(null) }}>
                  <span className={s.chip} style={{ background: 'var(--c-data)' }} /> 프론트엔드 <small>TypeScript·React·Next</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { setDimFilter('데이터/AI') }} onMouseLeave={() => { setDimFilter(null) }}>
                  <span className={s.chip} style={{ background: 'var(--c-ai)' }} /> 데이터/AI <small>RAG·GraphRAG·에이전트</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { setDimFilter('백엔드/인프라') }} onMouseLeave={() => { setDimFilter(null) }}>
                  <span className={s.chip} style={{ background: 'var(--c-dev)' }} /> 백엔드/인프라 <small>PostgreSQL·MCP</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { setDimFilter('제조/도메인') }} onMouseLeave={() => { setDimFilter(null) }}>
                  <span className={s.chip} style={{ background: 'var(--c-mfg)' }} /> 제조/도메인 <small>MES·계측·공정제어</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { setDimFilter('철학/원칙') }} onMouseLeave={() => { setDimFilter(null) }}>
                  <span className={s.chip} style={{ background: 'var(--c-phil)' }} /> 철학/원칙 <small>제1원칙·크로스도메인</small>
                </div>
              </div>
              <div className={s.tip} ref={tipRef}>
                <div className={s.tipDom} ref={tipDomRef} />
                <div className={s.tipLab} ref={tipLabRef} />
                <div className={s.tipVec} ref={tipVecRef} />
              </div>
            </div>
          </section>

          {/* INFERENCE CONSOLE */}
          <section className={`${s.card} ${s.consoleCard}`}>
            <div className={s.cardH}>
              <div className={s.cardHtt}><span className={s.sq} /> vault.agent — 의미지도 위 추론 스트림</div>
              <div ref={seedlineRef}>retriever cos_sim · top_p 0.92</div>
            </div>
            <div className={s.consoleBody}>
              <div className={s.qLine}>
                <span className={s.qmark}>user&nbsp;❯</span>
                <span className={s.qtext} ref={qtextRef}>이 지도는 무엇인가?</span>
              </div>
              <div className={s.thinking} ref={thinkRef}>
                <span>reasoning</span><div className={s.shimmer} /><span ref={thinkpctRef}>0%</span>
              </div>
              <div className={s.streamScroll} ref={scrollRef}>
                <div className={s.stream} ref={streamRef} />
                <span className={s.caret} />
              </div>
              <div className={s.attn} ref={attnRef}>
                <div className={s.attnLbl}>
                  <span>attention · 토큰별 가중치 (head 3/12)</span>
                  <span ref={attnqRef} />
                </div>
                <div className={s.heat} ref={heatRef} />
              </div>
              <div className={s.controls}>
                <div className={s.chips}>
                  {KEYS.map((key, i) => (
                    <button
                      key={key}
                      className={`${s.chipBtn}${i === 0 ? ' active' : ''}`}
                      ref={(el) => { chipRefs.current[i] = el }}
                    >
                      <span className={s.chipQ}>❯</span>
                      {QTEXT[key]}
                    </button>
                  ))}
                </div>
                <div className={s.ctlRow}>
                  <div className={s.temp}>
                    temp
                    <input type="range" ref={tempInputRef} min={0} max={100} defaultValue={35} />
                    <b ref={tempValRef}>0.35</b>
                    <span className={s.styname} ref={stynameRef}>[균형]</span>
                  </div>
                  <div className={s.runinfo}>
                    <span>retrieved <b ref={rcountRef}>0</b> ctx</span>
                    <span>latency <b ref={latRef}>—</b></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* live log */}
        <div className={s.liveLog}>
          <span className={s.liveBadge}>live</span>
          <span className={s.liveLogLine} ref={liveLogLineRef} />
        </div>

        {/* footer */}
        <footer className={s.footer}>
          <div className={s.footerWho}>
            <b>원칙</b> — 제1원칙으로 사고한다 · 지식을 구조로 만든다 · 도메인을 가로질러 연결한다
          </div>
        </footer>
      </div>
    </SceneHost>
  )

}
