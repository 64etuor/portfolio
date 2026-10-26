'use client'

import Link from 'next/link'
import { ProjectDetailLink } from '../projects/ProjectDetailLink'
import { ProjectDrawerHost } from '../projects/ProjectDrawerHost'
import { ResumeDragonHero } from './ResumeDragonHero'
import { PretextHeading } from './PretextHeading'
import { coverLetter } from '@content/coverLetter'
import type { ResumeData } from '@content/resume'
import { useLocale } from '../LocaleProvider'
import { ResumeEnglish } from './ResumeEnglish'

/**
 * ResumeDoc — the résumé body, rendered server-side from `public/resume.json`
 * (JSON-Resume schema) in our dark CRT-noir tone. The masthead is the
 * pretext-powered <canvas> hero; everything below is clean, print-friendly,
 * responsive HTML. Personal data (name / contact) is intentionally preserved —
 * a résumé is identity, not a film scene.
 */

export type { ResumeData }

const NAME_EN = 'Yangha Park'

/**
 * Maps a resume.json project name → its /projects/<slug> detail page. Explicit
 * (resume names differ from the project page titles); unmatched projects simply
 * render without a detail link. Keep in sync with content/projects/*.
 */
const PROJECT_DETAIL_SLUG: Record<string, string> = {
  'KIP — 출처까지 함께 답하는 사내 문서 검색 (RAG)': 'kip',
  'Work Radar — AI 에이전트를 함께 쓰는 개인 업무 관리 앱': 'work-radar',
  '뷰티 매장 CRM·키오스크·앱 플랫폼': 'kiosk-app',
  '신제품 생산 라인 셋업 프로젝트 (자동화 설비 MES 자체 개발)': 'mes-console',
  '개발품 DV 데이터 전산 관리 프로젝트': 'dv-data',
  '공정 추적성 관리 프로그램 개발 프로젝트': 'traceability',
  '공정 데이터 관리 시스템 개발 프로젝트': 'process-data',
  '삼성 제조 리더 교육 연계 과정 — 물류 시스템 개선 프로젝트': 'samsung-logistics',
  '유휴 설비 재활용 프로젝트': 'idle-equipment',
  '연간 생산라인 혁신 프로젝트': 'line-innovation',
  '중소기업진흥청 대기업상생 스마트 팩토리 도입 프로젝트': 'smart-factory',
}

/**
 * Render `**bold**` runs from the cover-letter source as <strong>. Plain text
 * is emitted as raw string nodes (not wrapped in <span>) so it flows and wraps
 * exactly like normal prose — no extra inline boxes to break on.
 */
function Emphasis({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  const nodes: React.ReactNode[] = []
  let offset = 0 // character offset → stable key for a given source string
  for (const part of parts) {
    nodes.push(
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={offset} className="rz-cl-em">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      ),
    )
    offset += part.length
  }
  return <>{nodes}</>
}

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section className="rz-section" id={id}>
      <PretextHeading label={label} />
      {children}
    </section>
  )
}

export function ResumeDoc({ data }: { data: ResumeData }) {
  const { locale } = useLocale()
  if (locale === 'en') return <ResumeEnglish data={data} />
  const { basics } = data
  const gh = basics.profiles?.find((p) => p.network.toLowerCase() === 'github')
  const portfolio = basics.profiles?.find((p) => p.network.toLowerCase() === 'portfolio')
  const blog = basics.profiles?.find((p) => p.network.toLowerCase() === 'blog')

  return (
    <main className="rz-root">
      <div className="rz-scan" aria-hidden />
      <div className="rz-vignette" aria-hidden />
      {/* Full-page dragon playfield — sits behind the sheet, roams from the
          masthead down into the body (pointer-events:none, keeps text readable). */}
      <ResumeDragonHero nameEn={NAME_EN} nameKr={basics.name} title={basics.label} />

      <div className="rz-sheet">
        {/* ── masthead ───────────────────────────────────────── */}
        <header className="rz-masthead">
          <p className="rz-eyebrow">
            RÉSUMÉ <span className="rz-acc">{'//'}</span> CURRICULUM VITAE
          </p>
          <h1 className="rz-sr-only">
            {NAME_EN} · {basics.name} — {basics.label}
          </h1>
          {/* reserves the title area; the dragon canvas paints the name here */}
          <div className="rz-hero-spacer" aria-hidden />
          {basics.summary && <p className="rz-summary kr">{basics.summary}</p>}

          <ul className="rz-contact" aria-label="contact">
            <li>
              <span className="rz-k">EMAIL</span>
              <a href={`mailto:${basics.email}`}>{basics.email}</a>
            </li>
            {portfolio && (
              <li>
                <span className="rz-k">PORTFOLIO</span>
                <a href={portfolio.url} target="_blank" rel="noreferrer">
                  {portfolio.url.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            {basics.phone && (
              <li>
                <span className="rz-k">PHONE</span>
                <a href={`tel:${basics.phone.replace(/[^0-9+]/g, '')}`}>{basics.phone}</a>
              </li>
            )}
            {gh && (
              <li>
                <span className="rz-k">GITHUB</span>
                <a href={gh.url} target="_blank" rel="noreferrer">
                  {gh.url.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            {blog && (
              <li>
                <span className="rz-k">BLOG</span>
                <a href={blog.url} target="_blank" rel="noreferrer">
                  {blog.url.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            {basics.url && (
              <li>
                <span className="rz-k">WEB</span>
                <a href={basics.url} target="_blank" rel="noreferrer">
                  {basics.url.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
          </ul>
        </header>

        {/* ── cover letter ───────────────────────────────────── */}
        <Section id="cover-letter" label="COVER LETTER">
          <div className="rz-cover">
            <p className="rz-cl-to">{coverLetter.to}</p>
            <div className="rz-cl-body kr">
              {coverLetter.paragraphs.map((para) => (
                <p key={para}>
                  <Emphasis text={para} />
                </p>
              ))}
            </div>
            <p className="rz-cl-signoff kr">
              {coverLetter.signOff}
              <span className="rz-cl-sign">— {coverLetter.signName}</span>
            </p>
          </div>
        </Section>

        {/* ── experience ─────────────────────────────────────── */}
        <Section id="experience" label="EXPERIENCE">
          <ol className="rz-timeline">
            {data.work.map((w) => (
              <li className="rz-entry" key={`${w.name}|${w.position}|${w.startDate}`}>
                <div className="rz-entry-head">
                  <div>
                    <h3 className="rz-entry-title kr">{w.name}</h3>
                    <p className="rz-entry-role kr">{w.position}</p>
                  </div>
                  {w.startDate && <span className="rz-period">{w.startDate}</span>}
                </div>
                {w.summary && <p className="rz-entry-sum kr">{w.summary}</p>}
                {w.highlights && (
                  <ul className="rz-bullets kr">
                    {w.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Section>

        {/* ── projects ───────────────────────────────────────── */}
        <Section id="projects" label="SELECTED PROJECTS">
          <p className="rz-projects-lead">
            각 프로젝트의 배경 · 구현 · 성과를 화면과 함께 정리했습니다.{' '}
            <Link className="rz-inline-link" href="/projects">
              전체 프로젝트 상세 보기 →
            </Link>
          </p>
          <div className="rz-projects">
            {data.projects.map((p) => {
              const slug = PROJECT_DETAIL_SLUG[p.name]
              return (
                <article className="rz-card" key={p.name}>
                  <div className="rz-card-head">
                    {slug ? (
                      <ProjectDetailLink slug={slug} className="rz-card-title rz-card-title-link kr">
                        {p.name}
                      </ProjectDetailLink>
                    ) : (
                      <h3 className="rz-card-title kr">{p.name}</h3>
                    )}
                    {p.entity && <span className="rz-card-org kr">{p.entity}</span>}
                  </div>
                  {p.roles && p.roles.length > 0 && <p className="rz-card-role kr">{p.roles.join(' · ')}</p>}
                  {p.description && <p className="rz-card-desc kr">{p.description}</p>}
                  {p.highlights && (
                    <ul className="rz-bullets rz-bullets-sm kr">
                      {p.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {p.keywords && (
                    <ul className="rz-chips" aria-label="stack">
                      {p.keywords.map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ul>
                  )}
                  {slug && (
                    <ProjectDetailLink slug={slug} className="rz-card-detail">
                      프로젝트 상세 보기 →
                    </ProjectDetailLink>
                  )}
                </article>
              )
            })}
          </div>
        </Section>

        {/* ── skills ─────────────────────────────────────────── */}
        <Section id="skills" label="SKILLS">
          <div className="rz-skills">
            {data.skills.map((s) => (
              <div className="rz-skill-group" key={s.name}>
                <h3 className="rz-skill-name kr">{s.name}</h3>
                <ul className="rz-chips rz-chips-quiet">
                  {s.keywords.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ── education + certificates ───────────────────────── */}
        <div className="rz-two-col">
          <Section id="education" label="EDUCATION">
            <ul className="rz-list">
              {data.education.map((e) => (
                <li className="rz-list-row" key={`${e.institution}|${e.area}|${e.startDate}`}>
                  <div>
                    <p className="rz-list-title kr">{e.institution}</p>
                    <p className="rz-list-sub kr">
                      {e.area}
                      {e.studyType ? ` · ${e.studyType}` : ''}
                    </p>
                  </div>
                  {e.startDate && <span className="rz-period">{e.startDate}</span>}
                </li>
              ))}
            </ul>
          </Section>

          {data.certificates && data.certificates.length > 0 && (
            <Section id="training" label="TRAINING & CERTS">
              <ul className="rz-list">
                {data.certificates.map((c) => (
                  <li className="rz-list-row" key={`${c.name}|${c.date}`}>
                    <div>
                      <p className="rz-list-title kr">{c.name}</p>
                      <p className="rz-list-sub kr">
                        {[c.issuer, c.summary].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {c.date && <span className="rz-period">{c.date}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <footer className="rz-foot">
          <span>{basics.name} · {NAME_EN}</span>
          <span className="rz-foot-sep">·</span>
          <span>ASCII dragon &amp; layout ported from pretext-playground (MIT)</span>
        </footer>
      </div>
      <ProjectDrawerHost />
    </main>
  )
}
