import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SCENES, sceneById } from '@/scenes/registry'
import { SceneFrame } from '@/components/SceneFrame'

export function generateStaticParams() {
  return SCENES.map((s) => ({ scene: s.slug }))
}

export default async function ScenePage({ params }: { params: Promise<{ scene: string }> }) {
  const { scene } = await params
  const s = sceneById(scene)
  if (!s) notFound()

  return (
    <div style={{ height: 'calc(100dvh - 49px)', display: 'flex', flexDirection: 'column', background: s.bg }}>
      <div className="flex items-center justify-between px-6 py-2 md:px-10" style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm hover:opacity-80" style={{ color: 'var(--muted)' }}>← 시안</Link>
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{s.id}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.title}</span>
          <span className="hidden text-xs md:inline" style={{ color: 'var(--accent)' }}>{s.domain}</span>
        </div>
        <a href={`/lab/${s.file}`} target="_blank" rel="noreferrer" className="text-xs hover:opacity-80" style={{ color: 'var(--muted)' }}>새 탭 ↗</a>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <SceneFrame file={s.file} title={s.title} bg={s.bg} />
      </div>
    </div>
  )
}
