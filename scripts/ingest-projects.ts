// Obsidian → /projects first-pass extractor.
//   npm run ingest:projects
// Reads content/projects/manifest.ts, pulls each source doc (or a numbered slice
// of Portfolio_Korean_v2.md) out of the OneDrive vault, normalizes Obsidian
// syntax, copies referenced images into public/projects/<slug>/, and writes a
// DRAFT ProjectContent to content/projects/<slug>.draft.ts for human curation.
//
// Drafts are intentionally rough — curation in content/projects/<slug>.ts is
// where the portfolio-quality copy lands. Runtime builds never read the vault.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { MANIFEST, type ManifestEntry } from '../content/projects/manifest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..')
const VAULT = join(homedir(), 'Library/CloudStorage/OneDrive-개인/Obsidian')

// --- one-time vault image index (basename → absolute path) ---
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])
const imgIndex = new Map<string, string>()
function indexImages(dir: string) {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) indexImages(p)
    else if (IMG_EXT.has(extname(name).toLowerCase()) && !imgIndex.has(name)) imgIndex.set(name, p)
  }
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n/, '')
}

/** Extract the callout block for project number `n` from Portfolio_Korean_v2.md. */
function sliceByNumber(md: string, n: string): string {
  const lines = md.split('\n').map((l) => l.replace(/^>+\s?/, '')) // strip callout '>' prefixes
  const startRe = new RegExp(`^#{1,3}\\s*=*\\s*${n}\\.`)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (startRe.test(lines[i])) {
      start = i
      break
    }
  }
  if (start === -1) return ''
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,3}\s*=*\s*\d+\./.test(lines[i]) || /^\[!/.test(lines[i]) || /^!\[!/.test(lines[i])) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

type Draft = {
  metrics: { label: string; value: string; note?: string }[]
  gallery: { src: string; caption?: string }[]
  sections: { heading: string; body: string }[]
}

function copyImage(slug: string, ref: string, outDir: string): string | null {
  const name = ref.split('|')[0].trim() // drop Obsidian |size
  const abs = imgIndex.get(name) ?? imgIndex.get(basename(name))
  if (!abs) {
    console.warn(`  ⚠ image not found: ${name}`)
    return null
  }
  const safe = basename(name).replace(/\s+/g, '-')
  mkdirSync(outDir, { recursive: true })
  copyFileSync(abs, join(outDir, safe))
  return `/projects/${slug}/${safe}`
}

function normalize(md: string, slug: string, outDir: string): Draft {
  const metrics: Draft['metrics'] = []
  const gallery: Draft['gallery'] = []

  // images: ![[name]] and standard ![alt](path) with wiki targets
  md = md.replace(/!\[\[([^\]]+)\]\]/g, (_m, ref) => {
    const src = copyImage(slug, ref, outDir)
    if (src) gallery.push({ src })
    return '' // remove from prose; galleries render separately
  })

  // ==highlight== → metric candidate + bold in prose
  md = md.replace(/==([^=]+)==/g, (_m, txt) => {
    metrics.push({ label: '', value: String(txt).trim() })
    return `**${String(txt).trim()}**`
  })

  // [[wikilink|label]] → label ; [[wikilink]] → text
  md = md.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')

  // callout markers >[!info] etc. and leftover '>' quotes
  md = md
    .split('\n')
    .map((l) => l.replace(/^>+\s?/, '').replace(/^\[!\w+\][+-]?\s*/, ''))
    .join('\n')

  // sections by markdown headings
  const sections: Draft['sections'] = []
  const parts = md.split(/^#{1,4}\s+/m)
  const headings = [...md.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => m[1].trim())
  // parts[0] = preamble before first heading
  const preamble = parts[0]?.trim()
  if (preamble) sections.push({ heading: '개요', body: preamble })
  for (let i = 0; i < headings.length; i++) {
    const body = (parts[i + 1] ?? '').replace(/^.+\n/, '').trim() // drop the heading line remainder
    if (body) sections.push({ heading: headings[i].replace(/[=*]/g, '').trim(), body })
  }

  return { metrics, gallery, sections }
}

function draftTs(entry: ManifestEntry, d: Draft): string {
  const j = (v: unknown) => JSON.stringify(v, null, 2)
  return `// DRAFT — auto-extracted from Obsidian. Curate then rename to ${entry.slug}.ts.
import type { ProjectContent } from './types'

export const ${entry.slug.replace(/-/g, '_')}: ProjectContent = {
  slug: ${j(entry.slug)},
  ganttId: ${j(entry.ganttId)},
  order: ${entry.order},
  enabled: ${entry.enabled},
  hero: {
    title: ${j(entry.title)},
    company: ${j(entry.company)},
    companyKey: ${j(entry.companyKey)},
    period: ${j(entry.period)},
    role: ${j(entry.title)},
  },
  summary: '',
  metrics: ${j(d.metrics.slice(0, 8))},
  stack: [],
  sections: ${j(d.sections)},
  gallery: ${j(d.gallery)},
}
`
}

function main() {
  console.log(`Indexing vault images under ${VAULT} …`)
  indexImages(VAULT)
  console.log(`  ${imgIndex.size} images indexed.`)

  for (const entry of MANIFEST) {
    const srcPath = join(VAULT, entry.source)
    let raw: string
    try {
      raw = readFileSync(srcPath, 'utf8')
    } catch {
      console.error(`✗ ${entry.slug}: cannot read ${entry.source}`)
      continue
    }
    let md = stripFrontmatter(raw)
    if (entry.sliceNumber) md = sliceByNumber(md, entry.sliceNumber)
    const outDir = join(REPO, 'public/projects', entry.slug)
    const d = normalize(md, entry.slug, outDir)
    const draftPath = join(REPO, 'content/projects', `${entry.slug}.draft.ts`)
    writeFileSync(draftPath, draftTs(entry, d), 'utf8')
    console.log(
      `✓ ${entry.slug}: ${d.sections.length} sections, ${d.gallery.length} images, ${d.metrics.length} metric hints`,
    )
  }
  console.log('\nDrafts written to content/projects/*.draft.ts — curate → <slug>.ts')
}

main()
