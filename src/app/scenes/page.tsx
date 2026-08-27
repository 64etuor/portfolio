import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { SCENES_GALLERY } from '@/components/gallery/data'
import { GalleryPageShell } from '@/components/gallery/GalleryPageShell'
import { SITE } from '@content/site'

export const metadata = {
  title: SITE.pages.scenes.ko,
  description:
    'DX→AX manifesto film — boot, SCENE 01–10, and ending. Explore interactive portfolio scenes in narrative order.',
}

export default function ScenesPage() {
  return (
    <GalleryPageShell
      title={SITE.gallery.scenes.title}
      sub={SITE.gallery.scenes.sub}
      footer={SITE.gallery.scenes.footer}
    >
      <GalleryGrid cards={SCENES_GALLERY} />
    </GalleryPageShell>
  )
}
