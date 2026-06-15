import Link from 'next/link'
import { PROFILE } from '@content/index'
import { SCENES } from '@/scenes/registry'
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

      {/* All 27 scenes */}
      <section className="mt-20">
        <h2 className="font-serif text-3xl font-semibold" style={{ color: 'var(--ink)' }}>27 시안</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>각 시안은 독립 모듈. 클릭하면 풀스크린으로 열립니다.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCENES.map((s) => (
            <Link key={s.id} href={`/s/${s.slug}`} className="group flex gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--accent)]" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <span className="mt-0.5 h-10 w-10 flex-none rounded-md border" style={{ background: s.bg, borderColor: 'var(--line)' }} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{s.id}</span>
                  <span className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.title}</span>
                  {s.featured && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>★</span>}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: 'var(--accent)' }}>{s.domain}</div>
                <p className="mt-1 line-clamp-2 text-xs leading-snug" style={{ color: 'var(--muted)' }}>{s.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
