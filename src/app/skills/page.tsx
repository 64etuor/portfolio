import { SkillsHubContent } from '@/components/gallery/SkillsHubContent'
import { SITE } from '@content/site'
import { pageMetadata } from '../seo'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = pageMetadata({
  title: SITE.pages.skills.ko,
  description:
    'Twenty hands-on portfolio pieces grouped across PM, process, development, infrastructure, and PKM.',
  path: '/skills',
})

export default function SkillsHubPage() {
  return (
    <>
      <SkillsHubContent />
      <SiteFooter width={1360} />
    </>
  )
}
