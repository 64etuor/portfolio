'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/components/LocaleProvider'
import { sceneForLocale } from '@content/i18n/scene-en'
import { catalogEntry } from '@/scenes/catalog'
import { localizeSceneText } from '@/scenes/_host/localize'
import { SceneMount } from '@/scenes/_host/SceneMount'
import type { Scene } from '@/scenes/registry'

export function CompositionViewer({
  title,
  blurb,
  scenes,
}: {
  title: string
  blurb: string
  scenes: Scene[]
}) {
  const { locale } = useLocale()
  const [i, setI] = useState(0)
  const s = scenes[i]
  const localizeScene = (scene: Scene) => {
    const entry = catalogEntry(scene.slug)
    return entry ? sceneForLocale(entry, locale) : scene
  }
  const localizedScene = localizeScene(s)
  const atStart = i === 0
  const atEnd = i === scenes.length - 1

  return (
    <div style={{ height: 'calc(100dvh - 49px)', display: 'flex', flexDirection: 'column', background: s.bg, transition: 'background 0.4s ease' }}>
      {/* composition control bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-2 md:px-10" style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="text-sm hover:opacity-80" style={{ color: 'var(--muted)' }}>←</Link>
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{localizeSceneText(title, locale)}</span>
          <span className="hidden truncate text-xs md:inline" style={{ color: 'var(--muted)' }}>{localizeSceneText(blurb, locale)}</span>
        </div>
        <div className="flex flex-none items-center gap-3">
          <div className="flex items-center gap-1.5">
            {scenes.map((sc, idx) => (
              <button
                key={sc.id}
                onClick={() => setI(idx)}
                title={`${sc.id} ${localizeScene(sc).title}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: idx === i ? 22 : 8, background: idx === i ? 'var(--accent)' : 'var(--line)' }}
              />
            ))}
          </div>
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{i + 1}/{scenes.length}</span>
          <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={atStart} className="rounded border px-2 py-1 text-xs disabled:opacity-30" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>← {localizeSceneText('이전', locale)}</button>
          <button onClick={() => setI((v) => Math.min(scenes.length - 1, v + 1))} disabled={atEnd} className="rounded border px-2 py-1 text-xs disabled:opacity-30" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>{localizeSceneText('다음', locale)} →</button>
        </div>
      </div>
      {/* current scene caption */}
      <div className="flex items-center gap-2 px-6 py-1.5 md:px-10" style={{ background: 'color-mix(in oklab, var(--bg) 50%, transparent)' }}>
        <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{s.id}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{localizedScene.title}</span>
        <span className="text-xs" style={{ color: 'var(--accent)' }}>{localizedScene.domain ?? s.domain}</span>
        <Link href={`/s/${s.slug}`} className="ml-auto text-xs hover:opacity-80" style={{ color: 'var(--muted)' }}>{localizeSceneText('단독 보기 ↗', locale)}</Link>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <SceneMount key={s.id} name={s.file} title={localizedScene.title} bg={s.bg} />
      </div>
    </div>
  )
}
