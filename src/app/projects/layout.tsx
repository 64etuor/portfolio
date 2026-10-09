// 편집용 세리프 — 이 세그먼트에서만 쓰므로 전역(app/fonts.ts)이 아니라 여기서 로드.
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/cormorant-garamond/600-italic.css'
import '@fontsource/noto-serif-kr/600.css'
import '../projects.css'

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children
}
