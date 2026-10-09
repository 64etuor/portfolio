import type { ReactNode } from 'react'

/**
 * Minimal inline renderer for a `sections[].body` string. Deliberately NOT a
 * markdown pipeline — supports only bold / italic / code / links so prose is
 * convenient to author while all structural presentation stays bespoke React.
 * Mirrors the resume subsystem's <Emphasis> approach (ResumeDoc.tsx).
 *
 * Block grammar: blank line → paragraph break; leading "- " lines → <ul>.
 * Inline grammar: **bold**, *italic*, `code`, [text](href).
 */

function InlineSpans({ text }: { text: string }): ReactNode {
  // Split on inline tokens, keeping delimiters. Keys are the token's character
  // offset in `text` — stable for a given body string, unlike a map index.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  const nodes: ReactNode[] = []
  let offset = 0
  for (const part of parts) {
    nodes.push(renderToken(part, `o${offset}`))
    offset += part.length
  }
  return <>{nodes}</>
}

function renderToken(part: string, key: string): ReactNode {
  if (part.startsWith('**') && part.endsWith('**')) {
    return <strong key={key}>{part.slice(2, -2)}</strong>
  }
  if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
    return <em key={key}>{part.slice(1, -1)}</em>
  }
  if (part.startsWith('`') && part.endsWith('`')) {
    return <code key={key} className="pj-code">{part.slice(1, -1)}</code>
  }
  const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
  if (link) {
    const external = /^https?:\/\//.test(link[2])
    return (
      <a
        key={key}
        href={link[2]}
        className="pj-link"
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {link[1]}
      </a>
    )
  }
  return part
}

/** Pair each string with a content-derived key; exact repeats get a `#n` suffix. */
function withContentKeys(items: string[]): [string, string][] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const n = seen.get(item) ?? 0
    seen.set(item, n + 1)
    return [item, n === 0 ? item : `${item}#${n}`]
  })
}

export function InlineBody({ body }: { body: string }): ReactNode {
  // Split into blocks on blank lines.
  const blocks = withContentKeys(body.trim().split(/\n{2,}/))
  return (
    <>
      {blocks.map(([block, bk]) => {
        const lines = block.split('\n')
        const isList = lines.every((l) => /^\s*-\s+/.test(l))
        if (isList) {
          return (
            <ul key={bk} className="pj-ul">
              {withContentKeys(lines).map(([l, lk]) => (
                <li key={lk}>
                  <InlineSpans text={l.replace(/^\s*-\s+/, '')} />
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bk} className="pj-p">
            <InlineSpans text={block.replace(/\n/g, ' ')} />
          </p>
        )
      })}
    </>
  )
}
