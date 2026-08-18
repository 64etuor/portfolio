// Resume type boundary — single projection from content/ SSOT → JSON Resume shape.
// ResumeDoc imports `ResumeData` from here; gen-resume.ts calls `toResumeData`.

import type { Profile } from './types'

// Sub-types mirroring JSON Resume schema fields used by ResumeDoc.
type ResumeProfile = { network: string; username: string; url: string }
type ResumeBasics = {
  name: string
  label: string
  email: string
  phone?: string
  url?: string
  summary?: string
  profiles?: ResumeProfile[]
}
type ResumeWork = {
  name: string
  position: string
  summary?: string
  highlights?: string[]
  startDate?: string
}
type ResumeProject = {
  name: string
  description?: string
  highlights?: string[]
  keywords?: string[]
  roles?: string[]
  entity?: string
  url?: string
}
type ResumeSkillGroup = { name: string; keywords: string[] }
type ResumeEducation = {
  institution: string
  area: string
  studyType?: string
  startDate?: string
}
type ResumeCertificate = {
  name: string
  issuer?: string
  summary?: string
  date?: string
}

export type ResumeData = {
  basics: ResumeBasics
  work: ResumeWork[]
  projects: ResumeProject[]
  skills: ResumeSkillGroup[]
  education: ResumeEducation[]
  certificates?: ResumeCertificate[]
}

/** Single projection from the merged SSOT Profile → ResumeData shape. */
export function toResumeData(p: Profile): ResumeData {
  return {
    basics: {
      name: p.identity.name,
      label: p.identity.title,
      email: p.contact.email,
      phone: p.contact.phone,
      url: p.contact.url ?? p.contact.githubPage,
      summary: p.identity.tagline,
      profiles: [
        {
          network: 'GitHub',
          username: p.contact.github.replace(/.*\//, ''),
          url: p.contact.github.startsWith('http')
            ? p.contact.github
            : `https://${p.contact.github}`,
        },
        ...(p.contact.blog
          ? [{ network: 'Blog', username: p.contact.blog.replace(/^https?:\/\//, ''), url: p.contact.blog }]
          : []),
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
      highlights: [
        ...pr.work,
        ...pr.impact.map(
          (i) => `${i.metric}: ${i.value}${i.krw ? ` (${i.krw})` : ''}`,
        ),
      ],
      keywords: pr.tech,
      roles: [pr.role],
      entity: pr.org,
      url: pr.links?.[0]?.url,
    })),
    skills: p.skills.map((s) => ({ name: s.name, keywords: s.keywords })),
    education: p.education.map((e) => ({
      institution: e.institution,
      area: e.area,
      studyType: e.note,
      startDate: e.period,
    })),
    certificates: (p.training ?? []).map((t) => ({
      name: t.name,
      issuer: t.org,
      summary: t.summary,
      date: t.period,
    })),
  }
}
