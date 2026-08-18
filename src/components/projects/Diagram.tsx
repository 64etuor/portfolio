import type { Diagram as DiagramData } from '@content/projects/types'

/** Bespoke on-brand SVG flow/pipeline diagram. Nodes lay out left→right in
    array order; forward edges (to the next node) draw straight arrows, and a
    wrap/back edge (to an earlier node — e.g. a cycle) draws a return arc below.
    Deterministic + server-rendered; styled via .pj-diagram in projects.css. */
export function Diagram({ diagram }: { diagram: DiagramData }) {
  const { nodes, edges } = diagram
  if (!nodes.length) return null

  const NW = 156
  const NH = 58
  const GAP = 48
  const PAD = 6
  const arcDepth = 46
  const width = nodes.length * NW + (nodes.length - 1) * GAP + PAD * 2
  const topY = 12
  const height = topY + NH + arcDepth + 26

  const idx = new Map(nodes.map((n, i) => [n.id, i]))
  const xOf = (i: number) => PAD + i * (NW + GAP)
  const cx = (i: number) => xOf(i) + NW / 2
  const midY = topY + NH / 2

  return (
    <div className="pj-diagram">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="process flow diagram">
        <defs>
          <marker id="pj-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--pj-deep)" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = idx.get(e.from)
          const b = idx.get(e.to)
          if (a === undefined || b === undefined) return null
          if (b === a + 1) {
            // forward straight arrow
            const x1 = xOf(a) + NW
            const x2 = xOf(b)
            return (
              <g key={i}>
                <line className="pj-edge" x1={x1} y1={midY} x2={x2 - 2} y2={midY} strokeWidth={1.5} markerEnd="url(#pj-arrow)" />
                {e.label ? (
                  <text className="pj-edge-l" x={(x1 + x2) / 2} y={midY - 8} textAnchor="middle" fontSize={10}>
                    {e.label}
                  </text>
                ) : null}
              </g>
            )
          }
          // wrap / back edge → arc under the row
          const from = cx(a)
          const to = cx(b)
          const baseY = topY + NH
          const arcY = baseY + arcDepth
          return (
            <path
              key={i}
              className="pj-edge"
              d={`M ${from} ${baseY} C ${from} ${arcY}, ${to} ${arcY}, ${to} ${baseY + 2}`}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              markerEnd="url(#pj-arrow)"
            />
          )
        })}

        {nodes.map((n, i) => {
          const lines = n.label.split(/<br\s*\/?>|\n/)
          return (
            <g className="pj-node" key={n.id} transform={`translate(${xOf(i)}, ${topY})`}>
              <rect width={NW} height={NH} rx={9} strokeWidth={1.3} />
              <text x={NW / 2} y={NH / 2} textAnchor="middle" dominantBaseline="central" fontSize={12}>
                {lines.map((ln, li) => (
                  <tspan key={li} x={NW / 2} dy={li === 0 ? -(lines.length - 1) * 7 : 14}>
                    {ln}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
