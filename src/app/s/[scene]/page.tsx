import { notFound } from 'next/navigation'
import { SCENES, sceneById } from '@/scenes/registry'
import { SceneMount } from '@/scenes/_host/SceneMount'

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
          {/* 백버튼/시안번호는 전역 SiteHeader(← Home)와 중복이라 제거. title/domain 만 컨텍스트로 표시. */}
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.title}</span>
          <span className="hidden text-xs md:inline" style={{ color: 'var(--accent)' }}>{s.domain}</span>
        </div>
        <a href={`/lab/${s.file}`} target="_blank" rel="noreferrer" className="text-xs hover:opacity-80" style={{ color: 'var(--muted)' }}>새 탭 ↗</a>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <SceneMount name={s.file} title={s.title} bg={s.bg} />
      </div>
    </div>
  )
}
