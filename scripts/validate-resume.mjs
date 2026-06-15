// resume.json 을 JSON Resume 스키마로 검증한다.
//   node scripts/validate-resume.mjs
// @jsonresume/schema 의 API 형태(callback/promise)가 버전마다 달라 모두 대응하고,
// 라이브러리를 못 불러오면 최소 구조 검사로 폴백한다.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resumePath = resolve(__dirname, '../src/data/resume.json')

const raw = await readFile(resumePath, 'utf8')
let resume
try {
  resume = JSON.parse(raw)
} catch (e) {
  console.error('✗ resume.json JSON 파싱 실패:', e.message)
  process.exit(1)
}

function structuralCheck(r) {
  const errs = []
  if (!r.basics?.name) errs.push('basics.name 누락')
  if (!Array.isArray(r.work)) errs.push('work 배열 누락')
  if (!Array.isArray(r.education)) errs.push('education 배열 누락')
  return errs
}

async function schemaValidate(r) {
  const mod = await import('@jsonresume/schema')
  const validate = mod.validate ?? mod.default?.validate ?? mod.default
  if (typeof validate !== 'function') throw new Error('validate 함수 없음')

  // promise 형태 우선 시도
  try {
    const result = validate(r)
    if (result && typeof result.then === 'function') {
      await result
      return []
    }
  } catch (e) {
    if (Array.isArray(e)) return e.map((x) => x.message ?? JSON.stringify(x))
    // callback 형태로 재시도
  }

  return await new Promise((res) => {
    try {
      validate(r, (err, report) => {
        if (err) {
          const list = Array.isArray(err) ? err : [err]
          res(list.map((x) => x.message ?? String(x)))
        } else if (report && report.valid === false) {
          res((report.errors ?? []).map((x) => x.message ?? JSON.stringify(x)))
        } else {
          res([])
        }
      })
    } catch (e) {
      res([`스키마 검증 호출 실패: ${e.message}`])
    }
  })
}

const structural = structuralCheck(resume)
if (structural.length) {
  console.error('✗ 구조 검사 실패:')
  structural.forEach((e) => console.error('  -', e))
  process.exit(1)
}

let schemaErrors = []
try {
  schemaErrors = await schemaValidate(resume)
} catch (e) {
  console.warn(`! 스키마 라이브러리 검증 생략 (${e.message}). 구조 검사만 통과.`)
  console.log('✓ resume.json 구조 검사 통과')
  process.exit(0)
}

if (schemaErrors.length) {
  console.error('✗ JSON Resume 스키마 위반:')
  schemaErrors.forEach((e) => console.error('  -', e))
  process.exit(1)
}

console.log('✓ resume.json — JSON Resume 스키마 검증 통과')
