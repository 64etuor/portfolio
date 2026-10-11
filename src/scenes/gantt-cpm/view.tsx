// Static JSX shell for the gantt-cpm scene. Pure presentational markup —
// holds no scene state; receives the ref handles the imperative build wires up.
// Extracted verbatim from Scene.tsx's return(...) — markup/classes IDENTICAL.

import type { RefObject } from 'react'
import type { Locale } from '@/i18n/content'
import { SceneHost } from '../_host/SceneHost'
import s from './scene.module.css'

const COPY = {
  ko: {
    name: '박양하',
    subtitle: '커리어 타임라인 & 프로젝트 임팩트 보드',
    roles: ['생산운영 PM · 공정기술 엔지니어', '데이터 · AI 시스템 빌더', '제조 3社 + 데이터·SW·AI 보강', '프로젝트 16건 · 수상 2회'],
    legend: ['은성', '이랜텍', '솔라엣지', '스타트업', '개인 PJ·교육', '크리티컬 패스(회사 · 제조 기준선→데이터 무결성→시스템 운영→AI 거버넌스)', 'Today', '마일스톤'],
    cpToggle: '크리티컬 패스 강조',
    dimToggle: '프로젝트 디밍',
    hint: '회사·프로젝트 막대를 클릭하면 역할 상세 + 비즈니스 임팩트가 열립니다.',
    cpChain: '제조 기준선 → 데이터 무결성 → 시스템 운영 → AI 거버넌스',
    cpTail: '프로젝트 = 병렬(Float)',
    boardTitle: '커리어 타임라인 · 회사 5社 + 프로젝트 16건 + 부트캠프 3종 · 마일스톤',
    boardMeta: '2020 Q3 → 2026 Q3 · 회사=크리티컬 패스 · 프로젝트=병렬 · Today 2026.06',
    chartLabel: '커리어 간트 차트',
    portfolio: '프로젝트 포트폴리오',
    heroLabel: '자기주도로 기획·리딩한 프로젝트',
    heroUnit: '건 · 5社 · 6년',
    heroSub: (
      <>
        제조 현장(은성·이랜텍·솔라엣지)에서 SW·AI까지 — 비전검사·라인혁신·물류 SCM·데이터/추적성·<b>MES 자체개발</b>·CRM 플랫폼·AI 업무 앱. 수상 2회(MOC Best·Core Value).
      </>
    ),
    heroEst: '집계: 회사 5社 위 자기주도 프로젝트 16건 · 2020.08–현재',
    scorecard: '커리어 임팩트 스코어카드',
    scorecardBadge: 'SCORECARD · 회사별 대표',
    cats: ['은성', '이랜텍', '솔라엣지', '삼성·SCM'],
    derived: '파생 비즈니스 프레이밍',
    capability: '역량 스택',
    footL: 'PARK YANGHA · 커리어 타임라인 & 프로젝트 임팩트 · GANTT v17 · CPM · 제조 3社 + 데이터·SW·AI 보강 · 프로젝트 16건',
    footR: '회사 = 크리티컬 패스 · 프로젝트 = 병렬(Float) · 부트캠프 = 역량 보강',
    close: '닫기',
    problem: '문제 · 상황',
    built: '직접 만든 도구 · 시스템',
    stack: '사용 기술',
    evidence: '운영 · 개선 증거',
    more: '자세히 보기',
    doc: '📄 상세 보기',
    rewind: '↩ 관련 장면',
    replay: '✦ 성과 하이라이트',
  },
  en: {
    name: 'Yangha Park',
    subtitle: 'Career Timeline & Project Impact Board',
    roles: ['Operations PM · Process Engineer', 'Data · AI Systems Builder', '3 manufacturers + data · SW · AI', '16 projects · 2 awards'],
    legend: ['Eunsung', 'Elentec', 'SolarEdge', 'Startup', 'Independent · learning', 'Critical path (companies · manufacturing baseline → data integrity → system operations → AI governance)', 'Today', 'Milestone'],
    cpToggle: 'Highlight critical path',
    dimToggle: 'Dim projects',
    hint: 'Click a company or project bar to open role details and business impact.',
    cpChain: 'manufacturing baseline → data integrity → system operations → AI governance',
    cpTail: 'projects = parallel (float)',
    boardTitle: 'Career timeline · 5 organizations + 16 projects + 3 bootcamps · milestones',
    boardMeta: '2020 Q3 → 2026 Q3 · companies = critical path · projects = parallel · Today 2026.06',
    chartLabel: 'Career Gantt chart',
    portfolio: 'Project portfolio',
    heroLabel: 'Self-initiated projects planned and led',
    heroUnit: ' projects · 5 orgs · 6 yrs',
    heroSub: (
      <>
        From the factory floor (Eunsung, Elentec, SolarEdge) to software and AI — vision inspection, line innovation, logistics SCM, data and traceability, an <b>in-house MES</b>, a CRM platform, and an AI work app. Two awards (MOC Best, Core Value).
      </>
    ),
    heroEst: 'Count: 16 self-initiated projects across 5 organizations · 2020.08–present',
    scorecard: 'Career impact scorecard',
    scorecardBadge: 'SCORECARD · one per company',
    cats: ['Eunsung', 'Elentec', 'SolarEdge', 'Samsung · SCM'],
    derived: 'Business framing',
    capability: 'Capability stack',
    footL: 'PARK YANGHA · Career timeline & project impact · GANTT v17 · CPM · 3 manufacturers + data · SW · AI · 16 projects',
    footR: 'Companies = critical path · projects = parallel (float) · bootcamps = upskilling',
    close: 'Close',
    problem: 'Problem · context',
    built: 'Tools and systems I built',
    stack: 'Technology',
    evidence: 'Operating and improvement evidence',
    more: 'Learn more',
    doc: '📄 View details',
    rewind: '↩ Related scene',
    replay: '✦ Highlight results',
  },
} as const

export interface GanttViewProps {
  locale: Locale
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
  locale,
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
  const c = COPY[locale]
  return (
    <SceneHost className={s.root} bg="#0c0f14" scroll>
      <div className={s.app} ref={rootRef}>
        {/* masthead */}
        <header className={s.mast}>
          <div className={s.mastL}>
            <div className={s.kicker}>CAREER TIMELINE · CRITICAL PATH METHOD · PROJECT PORTFOLIO</div>
            <h1>
              <span className={s.nm}>{c.name}</span> &nbsp;<span className={s.subt}>{c.subtitle}</span>
            </h1>
            <div className={s.roleRow}>
              <span className={`${s.rolePill} ${s.lead}`}>{c.roles[0]}</span>
              <span className={`${s.rolePill} ${s.lead}`}>{c.roles[1]}</span>
              <span className={s.rolePill}>{c.roles[2]}</span>
              <span className={s.rolePill}>{c.roles[3]}</span>
            </div>
          </div>
          <div className={s.mastR}>
            <div className={s.legend}>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-eun)' }} />{c.legend[0]}</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-elen)' }} />{c.legend[1]}</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-sol)' }} />{c.legend[2]}</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-mir)' }} />{c.legend[3]}</span>
              <span className={s.lg}><span className={s.sw} style={{ background: '#46c79a' }} />{c.legend[4]}</span>
              <span className={s.lg}><span className={s.swl} />{c.legend[5]}</span>
              <span className={s.lg}><span className={`${s.swl} ${s.t}`} />{c.legend[6]}</span>
              <span className={s.lg}><span className={s.swd} />{c.legend[7]}</span>
            </div>
          </div>
        </header>

        {/* controls */}
        <div className={s.controls}>
          <div className={s.ctlL}>
            <div className={`${s.toggle} ${s.on}`} ref={cpToggleRef} role="button" tabIndex={0} aria-pressed="true">
              <span className={s.dot} />{c.cpToggle}
            </div>
            <div className={`${s.toggle} ${s.ghost}`} ref={dimToggleRef} role="button" tabIndex={0} aria-pressed="false">
              <span className={s.dot} />{c.dimToggle}
            </div>
            <span className={s.hint}>{c.hint}</span>
          </div>
          <div className={`${s.cpNote} ${s.mono}`}>
            CP = <b>{c.cpChain}</b> · {c.cpTail}
          </div>
        </div>

        {/* main layout */}
        <div className={s.layout}>
          <section className={s.board} ref={boardWrapRef}>
            <div className={s.boardHd} ref={boardHdRef}>
              <h2>
                <span className={s.ix}>GANTT</span> {c.boardTitle}
              </h2>
              <div className={`${s.boardMeta} ${s.mono}`}>{c.boardMeta}</div>
            </div>
            <svg className={s.gantt} ref={svgRef} role="img" aria-label={c.chartLabel} />
          </section>

          <aside className={s.rail} ref={railRef}>
            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>{c.portfolio}</span>
                <span className={s.b}>KEY IMPACT</span>
              </div>
              <div className={s.hero}>
                <div className={s.lbl}>{c.heroLabel}</div>
                <div className={s.big}>
                  <span className={`${s.num} ${s.heroNum}`} ref={heroNumRef}>0</span>
                  <span className={s.unit}>{c.heroUnit}</span>
                </div>
                <div className={s.subd}>{c.heroSub}</div>
                <span className={s.est}>{c.heroEst}</span>
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>{c.scorecard}</span>
                <span className={s.b}>{c.scorecardBadge}</span>
              </div>
              <div className={s.catstrip}>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-eun)' }} />{c.cats[0]}</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-elen)' }} />{c.cats[1]}</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-sol)' }} />{c.cats[2]}</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-bridge)' }} />{c.cats[3]}</span>
              </div>
              <div className={s.kpis} ref={kpisRef} />
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>{c.derived}</span>
                <span className={s.b}>DERIVED</span>
              </div>
              <div className={s.derived} ref={derivedRef} />
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>{c.capability}</span>
                <span className={s.b}>CAPABILITY</span>
              </div>
              <div className={s.skills} ref={skillsRef} />
            </div>
          </aside>
        </div>

        <footer className={s.footer}>
          <div className={`${s.l} ${s.mono}`}>{c.footL}</div>
          <div className={`${s.r} ${s.mono}`}>{c.footR}</div>
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
          <div className={s.detailX} data-d="x" role="button" aria-label={c.close}>✕</div>
        </div>
        <div className={s.detailCrit} data-d="crit" />
        <div className={s.detailBody}>
          <div className={s.vpSection} data-sec="problem">
            <div className={s.vpLabel}><span className={s.vpNum}>①</span>{c.problem}</div>
            <div className={s.vpText} data-d="problem" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection} data-sec="built">
            <div className={s.vpLabel}><span className={s.vpNum}>②</span>{c.built}</div>
            <div className={s.vpText} data-d="built" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection}>
            <div className={s.vpLabel}><span className={s.vpNum}>③</span>{c.stack}</div>
            <div className={s.vpStack} data-d="stack" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection} data-sec="metrics">
            <div className={s.vpLabel}><span className={s.vpNum}>④</span>{c.evidence}</div>
            <div className={`${s.vpMetrics} ${s.dmetrics}`} data-d="metrics" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection}>
            <div className={s.vpLabel}><span className={s.vpNum}>⑤</span>{c.more}</div>
            <div className={s.vpActions}>
              <button className={s.vpDoc} data-d="doc" type="button" style={{ display: 'none' }}>{c.doc}</button>
              <button className={s.vpRewind} data-d="rewind" type="button">{c.rewind}</button>
              <button className={s.vpReplay} data-d="replay" type="button">{c.replay}</button>
            </div>
          </div>
        </div>
      </div>

      <div className={s.tip} ref={tipRef} />
    </SceneHost>
  )
}
