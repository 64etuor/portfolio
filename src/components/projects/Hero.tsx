import type { CSSProperties } from 'react'
import type { ProjectContent } from '@content/projects/types'
import { COMPANY_ACCENT } from '@content/projects/types'

/** Project masthead — serif title, employer·period eyebrow, role, summary, KPI chips.
    The per-employer accent is injected as --pj-acc so every block below inherits it. */
export function Hero({ project }: { project: ProjectContent }) {
  const { hero, summary, metrics } = project
  const accentStyle = { '--pj-acc': COMPANY_ACCENT[hero.companyKey] } as CSSProperties
  const chips = metrics.slice(0, 4)
  return (
    <header className="pj-hero" style={accentStyle}>
      <p className="pj-eyebrow">
        <span className="pj-acc">{hero.company}</span> · {hero.period}
      </p>
      <h1 className="pj-title">{hero.title}</h1>
      {hero.role && hero.role !== hero.title ? <p className="pj-role">{hero.role}</p> : null}
      {summary ? <p className="pj-summary">{summary}</p> : null}
      {chips.length > 0 ? (
        <ul className="pj-kpis">
          {chips.map((m, i) => (
            <li className="pj-kpi" key={i}>
              <span className="pj-kpi-v">{m.value}</span>
              {m.label ? <span className="pj-kpi-l">{m.label}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  )
}
