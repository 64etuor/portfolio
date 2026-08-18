import type { Section } from '@content/projects/types'
import { renderInline } from './inline'

/** Narrative sections — heading + light-markdown body via renderInline. */
export function Prose({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <section className="pj-section" key={i}>
          {s.heading ? <h2 className="pj-h2">{s.heading}</h2> : null}
          {renderInline(s.body)}
        </section>
      ))}
    </>
  )
}
