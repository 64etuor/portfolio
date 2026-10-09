import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { COMPOSITIONS, compBySlug } from '@/compositions'
import { sceneById } from '@/scenes/registry'
import { CompositionViewer } from '@/components/CompositionViewer'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ comp: string }>
}): Promise<Metadata> {
  const { comp } = await params
  const c = compBySlug(comp)
  if (!c) return {}
  return { title: `${c.title} · Composition`, description: c.blurb }
}

export function generateStaticParams() {
  return COMPOSITIONS.map((c) => ({ comp: c.slug }))
}

export default async function CompositionPage({ params }: { params: Promise<{ comp: string }> }) {
  const { comp } = await params
  const c = compBySlug(comp)
  if (!c) notFound()
  const scenes = c.scenes.flatMap((id) => {
    const scene = sceneById(id)
    return scene ? [scene] : []
  })
  if (scenes.length === 0) notFound()

  return <CompositionViewer title={c.title} blurb={c.blurb} scenes={scenes} />
}
