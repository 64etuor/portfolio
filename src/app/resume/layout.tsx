// /resume 전용 스타일을 이 세그먼트에서만 로드 — 루트 layout 에서 옮겨와
// 다른 라우트(랜딩·필름·씬)의 글로벌 CSS 페이로드를 줄인다.
import '../resume.css'

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return children
}
