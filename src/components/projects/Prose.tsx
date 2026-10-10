import type { Section } from '@content/projects/types'
import { InlineBody } from './inline'

/** Narrative sections — heading + light-markdown body via <InlineBody>. */
export function Prose({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s) => (
        <section className="pj-section" key={`${s.heading}|${s.body.slice(0, 48)}`}>
          {s.heading ? <h2 className="pj-h2">{s.heading}</h2> : null}
          <InlineBody body={s.body} />
        </section>
      ))}
    </>
  )
}
