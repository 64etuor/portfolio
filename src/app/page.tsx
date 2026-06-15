import Link from 'next/link'
import { PROFILE } from '@content/index'
import { SECTIONS, scenesBySection } from '@/scenes/registry'
import { COMPOSITIONS } from '@/compositions'

export default function Home() {
  const { identity, metrics } = PROFILE
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
      {/* Hero / identity (SSOT) */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--accent)' }}>
          {identity.title}
        </p>
        <h1 className="mt-4 font-serif text-5xl font-semibold md:text-7xl" style={{ color: 'var(--ink)' }}>
          {identity.name}
        </h1>
        <p className="mt-5 max-w-2xl text-lg md:text-xl" style={{ color: 'var(--ink)', opacity: 0.85 }}>
          {identity.tagline}
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--muted)' }}>
          {identity.beliefs.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
        {/* headline metrics from SSOT */}
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4" style={{ borderColor: 'var(--line)', background: 'var(--line)' }}>
          {metrics.slice(0, 8).map((m) => (
            <div key={m.metric} className="p-4" style={{ background: 'var(--panel)' }}>
              <div className="font-serif text-2xl font-semibold" style={{ color: 'var(--accent)' }}>{m.value}</div>
              <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{m.metric}{m.krw ? ` · ${m.krw}` : ''}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Compositions — 메시지별 조합 */}
      <section className="mt-20">
        <h2 className="font-serif text-3xl font-semibold" style={{ color: 'var(--ink)' }}>조합으로 보기</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>설명하고 싶은 메시지에 맞춰 시안을 엮은 순서.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMPOSITIONS.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="rounded-xl border p-5 transition-colors hover:border-[var(--accent)]" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{c.title}</div>
              <div className="mt-1 text-xs" style={{ color: 'var(--accent)' }}>{c.audience} · {c.scenes.length}개</div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 27 scenes grouped into the 5-act narrative */}
      <section className="mt-20">
        <h2 className="font-serif text-3xl font-semibold" style={{ color: 'var(--ink)' }}>27 시안 · 5막 서사</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>현장 → 측정 → 시스템 → 운영 → 자율 → 사람. 각 지표는 단 한 시안이 소유합니다.</p>
        {SECTIONS.map((sec) => (
          <div key={sec.id} className="mt-12">
            <div className="flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'var(--line)' }}>
              <span className="font-serif text-2xl font-semibold" style={{ color: 'var(--accent)' }}>{sec.n}</span>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{sec.title}</h3>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{sec.blurb}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scenesBySection(sec.id).map((s) => (
                <Link key={s.id} href={`/s/${s.slug}`} className="group flex gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--accent)]" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                  <span className="mt-0.5 h-10 w-10 flex-none rounded-md border" style={{ background: s.bg, borderColor: 'var(--line)' }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{s.id}</span>
                      <span className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.title}</span>
                      {s.featured && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>★</span>}
                    </div>
                    <div className="mt-0.5 text-[11px]" style={{ color: 'var(--accent)' }}>{s.domain}</div>
                    {s.owns && <div className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'color-mix(in oklab, var(--accent) 18%, transparent)', color: 'var(--ink)' }}>소유: {s.owns}</div>}
                    <p className="mt-1 line-clamp-2 text-xs leading-snug" style={{ color: 'var(--muted)' }}>{s.blurb}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
