import { Film } from '@/components/film/Film'
import { SITE } from '@content/site'
import { pageMetadata } from '../seo'

export const metadata = pageMetadata({
  title: SITE.film.title.ko,
  description: 'DX→AX 매니페스토 필름 — 부팅부터 SCENE 01–10, 엔딩까지 자동 재생되는 인터랙티브 포트폴리오.',
  path: '/film',
})

// /film = the autoplay portfolio "film" (DX→AX narrative). Reached from the
// landing's "Projects Portfolio" action; hands back to the landing when it ends.
export default function FilmPage() {
  return <Film />
}
