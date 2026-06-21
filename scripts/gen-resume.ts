// SSOT(content/) → JSON Resume(public/resume.json) 파생 생성.
//   npm run gen:resume
// resume.json 은 더 이상 진실원이 아니라 SSOT 의 *투영*이다.

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROFILE } from '../content/index'
import { toResumeData } from '../content/resume'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '../public/resume.json')

const p = PROFILE
const data = toResumeData(p)

const resume = {
  $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
  ...data,
  meta: { canonical: p.contact.url ?? p.contact.githubPage, generatedFrom: 'content/ (SSOT)', version: 'v1.0.0' },
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(resume, null, 2) + '\n', 'utf8')
console.log(`✓ resume.json 생성: ${out} (projects ${resume.projects.length}, work ${resume.work.length})`)
