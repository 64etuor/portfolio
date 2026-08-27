import { SkillsHubContent } from '@/components/gallery/SkillsHubContent'
import { SITE } from '@content/site'

export const metadata = {
  title: SITE.pages.skills.ko,
  description:
    'Twenty hands-on portfolio pieces grouped across PM, process, development, infrastructure, and PKM.',
}

export default function SkillsHubPage() {
  return <SkillsHubContent />
}
