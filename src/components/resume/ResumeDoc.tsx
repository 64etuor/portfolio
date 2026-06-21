import { ResumeDragonHero } from './ResumeDragonHero'
import { PretextHeading } from './PretextHeading'
import { coverLetter } from '@content/coverLetter'
import type { ResumeData } from '@content/resume'

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
 * Render `**bold**` runs from the cover-letter source as <strong>. Plain text
 * is emitted as raw string nodes (not wrapped in <span>) so it flows and wraps
 * exactly like normal prose — no extra inline boxes to break on.
 */
function renderEmphasis(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="rz-cl-em">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
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
  const { basics } = data
  const gh = basics.profiles?.find((p) => p.network.toLowerCase() === 'github')
  const portfolio = basics.profiles?.find((p) => p.network.toLowerCase() === 'portfolio')

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
            RÉSUMÉ <span className="rz-acc">//</span> CURRICULUM VITAE
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
              {coverLetter.paragraphs.map((para, i) => (
                <p key={i}>{renderEmphasis(para)}</p>
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
            {data.work.map((w, i) => (
              <li className="rz-entry" key={i}>
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
                    {w.highlights.map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Section>

        {/* ── projects ───────────────────────────────────────── */}
        <Section id="projects" label="SELECTED PROJECTS">
          <div className="rz-projects">
            {data.projects.map((p, i) => (
              <article className="rz-card" key={i}>
                <div className="rz-card-head">
                  <h3 className="rz-card-title kr">{p.name}</h3>
                  {p.entity && <span className="rz-card-org kr">{p.entity}</span>}
                </div>
                {p.roles && p.roles.length > 0 && <p className="rz-card-role kr">{p.roles.join(' · ')}</p>}
                {p.description && <p className="rz-card-desc kr">{p.description}</p>}
                {p.highlights && (
                  <ul className="rz-bullets rz-bullets-sm kr">
                    {p.highlights.map((h, j) => (
                      <li key={j}>{h}</li>
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
              </article>
            ))}
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
              {data.education.map((e, i) => (
                <li className="rz-list-row" key={i}>
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
                {data.certificates.map((c, i) => (
                  <li className="rz-list-row" key={i}>
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
    </main>
  )
}
