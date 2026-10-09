import type { Metadata } from 'next'
import { CandidateGrid } from './CandidateGrid'

export const metadata: Metadata = {
  title: 'Scene Candidates',
  robots: { index: false, follow: false },
}

/** 비공개 검토 페이지 — 링크/사이트맵 없음. 선택된 후보만 필름·갤러리로 승격한다. */
export default function CandidatesPage() {
  return (
    <main style={{ padding: '32px clamp(16px, 4vw, 48px)', minHeight: '100dvh' }}>
      <h1 style={{ fontSize: 20, marginBottom: 6 }}>Scene Candidates · three.js</h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 24 }}>호버하면 재생됩니다. 전체화면에서 필름 길이(6.5s 이상) 기준으로 비교하세요.</p>
      <CandidateGrid />
    </main>
  )
}
