import type { ReactNode } from 'react'

/**
 * Minimal inline renderer for a `sections[].body` string. Deliberately NOT a
 * markdown pipeline — supports only bold / italic / code / links so prose is
 * convenient to author while all structural presentation stays bespoke React.
 * Mirrors the resume subsystem's renderEmphasis approach (ResumeDoc.tsx).
 *
 * Block grammar: blank line → paragraph break; leading "- " lines → <ul>.
 * Inline grammar: **bold**, *italic*, `code`, [text](href).
 */

function renderInlineSpans(text: string, keyPrefix: string): ReactNode {
  // Split on inline tokens, keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
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
  })
}

export function renderInline(body: string): ReactNode {
  // Split into blocks on blank lines.
  const blocks = body.trim().split(/\n{2,}/)
  return blocks.map((block, bi) => {
    const lines = block.split('\n')
    const isList = lines.every((l) => /^\s*-\s+/.test(l))
    if (isList) {
      return (
        <ul key={`b-${bi}`} className="pj-ul">
          {lines.map((l, li) => (
            <li key={`b-${bi}-${li}`}>{renderInlineSpans(l.replace(/^\s*-\s+/, ''), `b-${bi}-${li}`)}</li>
          ))}
        </ul>
      )
    }
    return (
      <p key={`b-${bi}`} className="pj-p">
        {renderInlineSpans(block.replace(/\n/g, ' '), `b-${bi}`)}
      </p>
    )
  })
}
