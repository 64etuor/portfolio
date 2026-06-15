// SSOT 스키마 — 모든 시안·이력서가 이 타입을 통해 content/ 를 읽는다.

export interface Impact {
  metric: string
  value: string
  krw?: string // 원화 절감/효과액 (예: "연 5천만원")
}
export interface Link {
  label: string
  url: string
}
export interface Project {
  id: string
  name: string
  org: string
  period: string
  role: string
  background: string // 추진 배경
  work: string[]
  impact: Impact[]
  awards?: string[]
  tech: string[]
  domains: Array<'제조' | '데이터' | 'AI' | '개발' | 'PM' | '품질' | '하드웨어'>
  links?: Link[]
}
export interface ExperienceItem {
  company: string
  title: string
  period: string
  summary?: string
  highlights?: string[]
}
export interface SkillGroup {
  name: string
  keywords: string[]
}
export interface WritingItem {
  title: string
  kind: 'essay' | 'poem' | 'column'
  quote: string
  year?: string
}
export interface PhilosophyLens {
  name: string
  idea: string
  bridge: string // 엔지니어링 적용
}
export interface Metric {
  metric: string
  value: string
  krw?: string
  note?: string
}
export interface EducationItem {
  institution: string
  area: string
  period?: string
  note?: string
}
export interface TrainingItem {
  name: string
  org?: string
  period?: string
  summary?: string
}
export interface Identity {
  name: string
  nameEn: string
  title: string
  tagline: string
  beliefs: string[]
  quotes: Array<{ text: string; source?: string }>
}
export interface Contact {
  email: string
  phone?: string
  github: string
  githubPage?: string
  url?: string
}
export interface Profile {
  identity: Identity
  contact: Contact
  projects: Project[]
  experience: ExperienceItem[]
  skills: SkillGroup[]
  industrialSkills?: SkillGroup[]
  education: EducationItem[]
  training?: TrainingItem[]
  writing: WritingItem[]
  philosophy: PhilosophyLens[]
  metrics: Metric[]
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<U>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}
