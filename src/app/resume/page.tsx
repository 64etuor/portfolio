import type { Metadata } from 'next'
import { ResumeDoc, type ResumeData } from '@/components/resume/ResumeDoc'
import resumeJson from '../../../public/resume.json'
import { PROFILE } from '@content/index'

// JSON-Resume (public/resume.json) is the canonical résumé source. Personal
// data is intentionally preserved — unlike the film scenes, a résumé IS the
// person. Rendered in our dark CRT-noir tone with the pretext canvas masthead.
const data = resumeJson as unknown as ResumeData

export const metadata: Metadata = {
  title: `${PROFILE.identity.name} · Résumé`,
  description: PROFILE.identity.tagline,
}

export default function ResumePage() {
  return <ResumeDoc data={data} />
}
