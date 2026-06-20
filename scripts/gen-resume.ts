// SSOT(content/) → JSON Resume(public/resume.json) 파생 생성.
//   npm run gen:resume
// resume.json 은 더 이상 진실원이 아니라 SSOT 의 *투영*이다.

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROFILE } from '../content/index'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '../public/resume.json')

const p = PROFILE

const resume = {
  $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
  basics: {
    name: p.identity.name,
    label: p.identity.title,
    email: p.contact.email,
    phone: p.contact.phone,
    url: p.contact.url ?? p.contact.githubPage,
    summary: p.identity.tagline,
    profiles: [
      { network: 'GitHub', username: p.contact.github.replace(/.*\//, ''), url: p.contact.github.startsWith('http') ? p.contact.github : `https://${p.contact.github}` },
    ],
  },
  work: p.experience.map((e) => ({
    name: e.company,
    position: e.title,
    summary: e.summary,
    highlights: e.highlights ?? [],
    // period 문자열은 JSON Resume ISO 필드 대신 highlights/summary 로 보존
    startDate: e.period,
  })),
  projects: p.projects.map((pr) => ({
    name: pr.name,
    description: pr.background,
    highlights: [...pr.work, ...pr.impact.map((i) => `${i.metric}: ${i.value}${i.krw ? ` (${i.krw})` : ''}`)],
    keywords: pr.tech,
    roles: [pr.role],
    entity: pr.org,
    url: pr.links?.[0]?.url,
  })),
  skills: p.skills.map((s) => ({ name: s.name, keywords: s.keywords })),
  education: p.education.map((e) => ({ institution: e.institution, area: e.area, studyType: e.note, startDate: e.period })),
  certificates: (p.training ?? []).map((t) => ({ name: t.name, issuer: t.org, summary: t.summary, date: t.period })),
  meta: { canonical: p.contact.url ?? p.contact.githubPage, generatedFrom: 'content/ (SSOT)', version: 'v1.0.0' },
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(resume, null, 2) + '\n', 'utf8')
console.log(`✓ resume.json 생성: ${out} (projects ${resume.projects.length}, work ${resume.work.length})`)
