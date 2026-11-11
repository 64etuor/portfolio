import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { SCENES_GALLERY } from '@/components/gallery/data'
import { GalleryPageShell } from '@/components/gallery/GalleryPageShell'
import { SITE } from '@content/site'
import { pageMetadata } from '../seo'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = pageMetadata({
  title: SITE.pages.scenes.ko,
  description:
    'DX→AX manifesto film — boot, SCENE 01–10, and ending, with work scenes from real projects. Explore the interactive scenes in narrative order.',
  path: '/scenes',
})

export default function ScenesPage() {
  return (
    <>
    <GalleryPageShell
      title={SITE.gallery.scenes.title}
      sub={SITE.gallery.scenes.sub}
      footer={SITE.gallery.scenes.footer}
    >
      <GalleryGrid cards={SCENES_GALLERY} />
    </GalleryPageShell>
    <SiteFooter width={1360} />
    </>
  )
}
