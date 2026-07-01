// Static JSX shell for the gantt-cpm scene. Pure presentational markup —
// holds no scene state; receives the ref handles the imperative build wires up.
// Extracted verbatim from Scene.tsx's return(...) — markup/classes IDENTICAL.

import type { RefObject } from 'react'
import { SceneHost } from '../_host/SceneHost'
import s from './scene.module.css'

export interface GanttViewProps {
  rootRef: RefObject<HTMLDivElement | null>
  boardWrapRef: RefObject<HTMLElement | null>
  svgRef: RefObject<SVGSVGElement | null>
  railRef: RefObject<HTMLDivElement | null>
  boardHdRef: RefObject<HTMLDivElement | null>
  kpisRef: RefObject<HTMLDivElement | null>
  derivedRef: RefObject<HTMLDivElement | null>
  skillsRef: RefObject<HTMLDivElement | null>
  heroNumRef: RefObject<HTMLSpanElement | null>
  detailRef: RefObject<HTMLDivElement | null>
  tipRef: RefObject<HTMLDivElement | null>
  cpToggleRef: RefObject<HTMLDivElement | null>
  dimToggleRef: RefObject<HTMLDivElement | null>
}

export function GanttView({
  rootRef,
  boardWrapRef,
  svgRef,
  railRef,
  boardHdRef,
  kpisRef,
  derivedRef,
  skillsRef,
  heroNumRef,
  detailRef,
  tipRef,
  cpToggleRef,
  dimToggleRef,
}: GanttViewProps) {
  return (
    <SceneHost className={s.root} bg="#0c0f14" scroll>
      <div className={s.app} ref={rootRef}>
        {/* masthead */}
        <header className={s.mast}>
          <div className={s.mastL}>
            <div className={s.kicker}>CAREER TIMELINE · CRITICAL PATH METHOD · PROJECT PORTFOLIO</div>
            <h1>
              <span className={s.nm}>박양하</span> &nbsp;<span className={s.subt}>커리어 타임라인 &amp; 프로젝트 임팩트 보드</span>
            </h1>
            <div className={s.roleRow}>
              <span className={`${s.rolePill} ${s.lead}`}>생산운영 PM · 공정기술 엔지니어</span>
              <span className={`${s.rolePill} ${s.lead}`}>데이터 · AI 시스템 빌더</span>
              <span className={s.rolePill}>제조 3社 + 데이터·SW·AI 보강</span>
              <span className={s.rolePill}>프로젝트 16건 · 수상 2회</span>
            </div>
          </div>
          <div className={s.mastR}>
            <div className={s.legend}>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-eun)' }} />은성</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-elen)' }} />이랜텍</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-sol)' }} />솔라엣지</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-mir)' }} />스타트업</span>
              <span className={s.lg}><span className={s.sw} style={{ background: '#46c79a' }} />개인 PJ·교육</span>
              <span className={s.lg}><span className={s.swl} />크리티컬 패스(회사 · 제조 기준선→데이터 무결성→시스템 운영→AI 거버넌스)</span>
              <span className={s.lg}><span className={`${s.swl} ${s.t}`} />Today</span>
              <span className={s.lg}><span className={s.swd} />마일스톤</span>
            </div>
          </div>
        </header>

        {/* controls */}
        <div className={s.controls}>
          <div className={s.ctlL}>
            <div className={`${s.toggle} ${s.on}`} ref={cpToggleRef} role="button" tabIndex={0} aria-pressed="true">
              <span className={s.dot} />크리티컬 패스 강조
            </div>
            <div className={`${s.toggle} ${s.ghost} ${s.on}`} ref={dimToggleRef} role="button" tabIndex={0} aria-pressed="true">
              <span className={s.dot} />프로젝트 디밍
            </div>
            <span className={s.hint}>회사·프로젝트 막대를 클릭하면 역할 상세 + 비즈니스 임팩트가 열립니다.</span>
          </div>
          <div className={`${s.cpNote} ${s.mono}`}>
            CP = <b>제조 기준선 → 데이터 무결성 → 시스템 운영 → AI 거버넌스</b> · 프로젝트 = 병렬(Float)
          </div>
        </div>

        {/* main layout */}
        <div className={s.layout}>
          <section className={s.board} ref={boardWrapRef}>
            <div className={s.boardHd} ref={boardHdRef}>
              <h2>
                <span className={s.ix}>GANTT</span> 커리어 타임라인 · 회사 5社 + 프로젝트 16건 + 부트캠프 3종 · 마일스톤
              </h2>
              <div className={`${s.boardMeta} ${s.mono}`}>2020 Q3 → 2026 Q3 · 회사=크리티컬 패스 · 프로젝트=병렬 · Today 2026.06</div>
            </div>
            <svg className={s.gantt} ref={svgRef} role="img" aria-label="커리어 간트 차트" />
          </section>

          <aside className={s.rail} ref={railRef}>
            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>프로젝트 포트폴리오</span>
                <span className={s.b}>KEY IMPACT</span>
              </div>
              <div className={s.hero}>
                <div className={s.lbl}>자기주도로 기획·리딩한 프로젝트</div>
                <div className={s.big}>
                  <span className={`${s.num} ${s.heroNum}`} ref={heroNumRef}>0</span>
                  <span className={s.unit}>건 · 5社 · 6년</span>
                </div>
                <div className={s.subd}>
                  제조 현장(은성·이랜텍·솔라엣지)에서 SW·AI까지 — 비전검사·라인혁신·물류 SCM·데이터/추적성·<b>MES 자체개발</b>·CRM 플랫폼·AI 콕핏. 수상 2회(MOC Best·Core Value).
                </div>
                <span className={s.est}>집계: 회사 5社 위 자기주도 프로젝트 16건 · 2020.08–현재</span>
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>커리어 임팩트 스코어카드</span>
                <span className={s.b}>SCORECARD · 회사별 대표</span>
              </div>
              <div className={s.catstrip}>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-eun)' }} />은성</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-elen)' }} />이랜텍</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-sol)' }} />솔라엣지</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-bridge)' }} />삼성·SCM</span>
              </div>
              <div className={s.kpis} ref={kpisRef} />
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>파생 비즈니스 프레이밍</span>
                <span className={s.b}>DERIVED</span>
              </div>
              <div className={s.derived} ref={derivedRef} />
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>역량 스택</span>
                <span className={s.b}>CAPABILITY</span>
              </div>
              <div className={s.skills} ref={skillsRef} />
            </div>
          </aside>
        </div>

        <footer className={s.footer}>
          <div className={`${s.l} ${s.mono}`}>
            PARK YANGHA · 커리어 타임라인 &amp; 프로젝트 임팩트 · GANTT v17 · CPM · 제조 3社 + 데이터·SW·AI 보강 · 프로젝트 16건
          </div>
          <div className={`${s.r} ${s.mono}`}>회사 = 크리티컬 패스 · 프로젝트 = 병렬(Float) · 부트캠프 = 역량 보강</div>
        </footer>
      </div>

      {/* detail panel */}
      <div className={s.detail} ref={detailRef} aria-live="polite">
        <div className={s.detailBar} data-d="bar" />
        <div className={s.detailHd}>
          <div>
            <div className={s.co} data-d="co" />
            <div className={s.ti} data-d="ti" />
            <div className={`${s.pd} ${s.mono}`} data-d="pd" />
          </div>
          <div className={s.detailX} data-d="x" role="button" aria-label="닫기">✕</div>
        </div>
        <div className={s.detailCrit} data-d="crit" />
        <div className={s.detailBody}>
          <div className={s.vpSection} data-sec="problem">
            <div className={s.vpLabel}><span className={s.vpNum}>①</span>문제 · 상황</div>
            <div className={s.vpText} data-d="problem" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection} data-sec="built">
            <div className={s.vpLabel}><span className={s.vpNum}>②</span>직접 만든 도구 · 시스템</div>
            <div className={s.vpText} data-d="built" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection}>
            <div className={s.vpLabel}><span className={s.vpNum}>③</span>사용 기술</div>
            <div className={s.vpStack} data-d="stack" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection} data-sec="metrics">
            <div className={s.vpLabel}><span className={s.vpNum}>④</span>운영 · 개선 증거</div>
            <div className={`${s.vpMetrics} ${s.dmetrics}`} data-d="metrics" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection}>
            <div className={s.vpLabel}><span className={s.vpNum}>⑤</span>자세히 보기</div>
            <div className={s.vpActions}>
              <button className={s.vpDoc} data-d="doc" type="button" style={{ display: 'none' }}>📄 프로젝트 상세 보기 →</button>
              <button className={s.vpRewind} data-d="rewind" type="button">↩ 관련 장면 보기</button>
              <button className={s.vpReplay} data-d="replay" type="button">핵심 성과 하이라이트</button>
            </div>
          </div>
        </div>
      </div>

      <div className={s.tip} ref={tipRef} />
    </SceneHost>
  )
}
