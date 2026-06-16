'use client'

/**
 * Finale — full-screen interactive destination embedding the gantt.
 * Reached by the "Skip to Gantt" button or by the end of the reel.
 * A small dry caption sits above the interactive iframe.
 */
export function Finale() {
  return (
    <section
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        background: '#0c0f14',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
            fontSize: 13,
            letterSpacing: '0.04em',
            color: 'rgba(238,243,248,0.85)',
          }}
        >
          이제 직접 확인하세요
        </span>
        <a
          href="/?intro"
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 999,
            padding: '5px 12px',
          }}
        >
          ↻ 다시 보기
        </a>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <iframe
          src="/lab/17-gantt-cpm.html?finale"
          title="커리어 간트 — 인터랙티브 피날레"
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </div>
    </section>
  )
}
