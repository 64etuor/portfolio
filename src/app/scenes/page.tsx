import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { SCENES_GALLERY } from '@/components/gallery/data'
import { GalleryPageShell } from '@/components/gallery/GalleryPageShell'

export const metadata = { title: 'Scenes · 필름 서사 — Lab' }

export default function ScenesPage() {
  return (
    <GalleryPageShell
      title="Scenes · 필름 서사"
      sub={
        <>
          DX→AX 매니페스토 필름 — 부팅 + SCENE 01–10 + 엔딩, 서사 순서대로. 미리보기는 부하를 줄이려{' '}
          <b>화면에 보일 때만</b> 재생됩니다 — 각 카드의 <b>전체화면으로 열기</b>로 인터랙션을 재생하세요. 자동 재생 필름은 홈의 <b>Portfolio</b>에서.
        </>
      }
      footer="부팅 + SCENE 01–10 + 엔딩 · 미리보기는 뷰포트 진입 시 재생 · 자동 재생은 홈 → Portfolio."
    >
      <GalleryGrid cards={SCENES_GALLERY} />
    </GalleryPageShell>
  )
}
