import type { Metric } from '@content/projects/types'

/** Hard-evidence KPI cards — the portfolio's "proof" moment. */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  if (!metrics.length) return null
  return (
    <div className="pj-metrics">
      {metrics.map((m) => (
        <div className="pj-metric" key={`${m.label}|${m.value}`}>
          <p className="pj-metric-v">{m.value}</p>
          {m.label ? <p className="pj-metric-l">{m.label}</p> : null}
          {m.note ? <p className="pj-metric-n">{m.note}</p> : null}
        </div>
      ))}
    </div>
  )
}
