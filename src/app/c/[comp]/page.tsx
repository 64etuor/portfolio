import { notFound } from 'next/navigation'
import { COMPOSITIONS, compBySlug } from '@/compositions'
import { sceneById, type Scene } from '@/scenes/registry'
import { CompositionViewer } from '@/components/CompositionViewer'

export function generateStaticParams() {
  return COMPOSITIONS.map((c) => ({ comp: c.slug }))
}

export default async function CompositionPage({ params }: { params: Promise<{ comp: string }> }) {
  const { comp } = await params
  const c = compBySlug(comp)
  if (!c) notFound()
  const scenes = c.scenes.map((id) => sceneById(id)).filter(Boolean) as Scene[]
  if (scenes.length === 0) notFound()

  return <CompositionViewer title={c.title} blurb={c.blurb} scenes={scenes} />
}
