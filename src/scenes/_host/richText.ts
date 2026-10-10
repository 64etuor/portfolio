/**
 * Safe DOM construction for scene runtimes — replaces innerHTML /
 * dangerouslySetInnerHTML sinks.
 *
 * Two tools:
 *   h() / svg()       hyperscript builders for structural templates. Text
 *                     children always become Text nodes (never parsed).
 *   parseMarkup()     a tiny allow-listed parser for the inline copy that the
 *                     scene data files author as markup (`<b>…</b>`, pid-scheme
 *                     panel bodies, …). Only the tags in ALLOWED_TAGS and the
 *                     `class` attribute survive; any other tag is kept as
 *                     literal text, any other attribute is dropped. No script,
 *                     URL or event-handler surface can be produced.
 *     setMarkup()     → DOM (replaceChildren)
 *     markupToReact() → React nodes for JSX sites
 */
import { createElement, type ReactNode } from 'react'

/* ---------------------------------------------------------------- builders */

export type Child = Node | string | number | false | null | undefined
type Attrs = Record<string, string | number | false | null | undefined>

function applyAttrs(el: Element, attrs: Attrs | string | null | undefined) {
  if (attrs == null) return
  if (typeof attrs === 'string') {
    el.setAttribute('class', attrs)
    return
  }
  for (const k in attrs) {
    const v = attrs[k]
    if (v === false || v == null) continue
    el.setAttribute(k, String(v))
  }
}

function appendChildren(el: Element, children: (Child | Child[])[]) {
  for (const c of children.flat()) {
    if (c === false || c == null || c === '') continue
    el.append(typeof c === 'number' ? String(c) : c)
  }
}

/** HTML element. `attrs` may be a class string or an attribute map. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | string | null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  applyAttrs(el, attrs)
  appendChildren(el, children)
  return el
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** SVG element (SVG namespace). */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Attrs | string | null,
  ...children: (Child | Child[])[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K]
  applyAttrs(el, attrs)
  appendChildren(el, children)
  return el
}

/* ---------------------------------------------------- allow-listed markup */

export type MarkupNode = string | { tag: string; cls: string | null; children: MarkupNode[] }

const ALLOWED_TAGS = new Set(['b', 'strong', 'em', 'i', 'u', 'small', 'code', 'sub', 'sup', 'span', 'div', 'p', 'h4', 'ul', 'ol', 'li', 'br'])
const VOID_TAGS = new Set(['br'])
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g
const ATTR_CLASS_RE = /(?:^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/
const ENTITY_RE = /&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g

function decodeEntities(text: string): string {
  if (!text.includes('&')) return text
  return text.replace(ENTITY_RE, (m, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
    if (dec || hex) {
      const cp = dec ? parseInt(dec, 10) : parseInt(hex!, 16)
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m
    }
    return NAMED_ENTITIES[name!] ?? m
  })
}

const parseCache = new Map<string, MarkupNode[]>()

/** Parses allow-listed markup into an immutable node tree (memoised per string). */
export function parseMarkup(markup: string): MarkupNode[] {
  const cached = parseCache.get(markup)
  if (cached) return cached

  const root: MarkupNode[] = []
  const stack: { tag: string; children: MarkupNode[] }[] = [{ tag: '', children: root }]
  const pushText = (raw: string) => {
    if (!raw) return
    const text = decodeEntities(raw)
    const kids = stack[stack.length - 1].children
    const last = kids[kids.length - 1]
    if (typeof last === 'string') kids[kids.length - 1] = last + text
    else kids.push(text)
  }

  let cursor = 0
  TAG_RE.lastIndex = 0
  for (let m = TAG_RE.exec(markup); m; m = TAG_RE.exec(markup)) {
    const [whole, closing, rawTag, attrs] = m
    const tag = rawTag.toLowerCase()
    pushText(markup.slice(cursor, m.index))
    cursor = m.index + whole.length
    if (!ALLOWED_TAGS.has(tag)) {
      pushText(whole) // not allow-listed → literal text
      continue
    }
    if (closing) {
      const at = stack.map((f) => f.tag).lastIndexOf(tag)
      if (at > 0) stack.length = at
      continue
    }
    const cm = ATTR_CLASS_RE.exec(attrs)
    const node = { tag, cls: cm ? decodeEntities(cm[1] ?? cm[2] ?? cm[3]) : null, children: [] as MarkupNode[] }
    stack[stack.length - 1].children.push(node)
    if (!VOID_TAGS.has(tag)) stack.push(node)
  }
  pushText(markup.slice(cursor))

  parseCache.set(markup, root)
  return root
}

function toDom(nodes: MarkupNode[], parent: Node) {
  for (const n of nodes) {
    if (typeof n === 'string') {
      parent.appendChild(document.createTextNode(n))
      continue
    }
    const el = document.createElement(n.tag)
    if (n.cls !== null) el.className = n.cls
    toDom(n.children, el)
    parent.appendChild(el)
  }
}

/** Replaces `el`'s children with the DOM for allow-listed `markup`. */
export function setMarkup(el: Element, markup: string): void {
  const frag = document.createDocumentFragment()
  toDom(parseMarkup(markup), frag)
  el.replaceChildren(frag)
}

function toReact(nodes: MarkupNode[]): ReactNode[] {
  return nodes.map((n, i) =>
    typeof n === 'string'
      ? n
      : createElement(n.tag, { key: i, className: n.cls ?? undefined }, ...(VOID_TAGS.has(n.tag) ? [] : toReact(n.children)))
  )
}

/** React rendering of allow-listed `markup` (same tree as setMarkup). */
export function markupToReact(markup: string): ReactNode[] {
  return toReact(parseMarkup(markup))
}
