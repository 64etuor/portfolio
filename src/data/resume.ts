import data from './resume.json'

/** JSON Resume 스키마의 우리가 쓰는 부분만 추린 경량 타입. */
export interface ResumeWork {
  name: string
  position: string
  startDate?: string
  endDate?: string
  url?: string
  summary?: string
  highlights?: string[]
}
export interface ResumeEducation {
  institution: string
  area: string
  studyType?: string
  startDate?: string
  endDate?: string
}
export interface ResumeCertificate {
  name: string
  date?: string
  issuer?: string
  summary?: string
}
export interface ResumeSkill {
  name: string
  keywords?: string[]
}
export interface ResumeLanguage {
  language: string
  fluency?: string
}
export interface ResumeProfile {
  network: string
  username: string
  url: string
}
export interface Resume {
  basics: {
    name: string
    label?: string
    email?: string
    phone?: string
    url?: string
    summary?: string
    location?: { countryCode?: string; region?: string }
    profiles?: ResumeProfile[]
  }
  work: ResumeWork[]
  education: ResumeEducation[]
  certificates: ResumeCertificate[]
  skills: ResumeSkill[]
  languages: ResumeLanguage[]
}

export const resume = data as Resume

/** "2025-08-01" → "2025.08", endDate 없으면 "현재". */
export function fmtPeriod(start?: string, end?: string): string {
  const fmt = (d?: string) => (d ? d.slice(0, 7).replace('-', '.') : '')
  const s = fmt(start)
  const e = end ? fmt(end) : '현재'
  return s ? `${s} – ${e}` : e
}
