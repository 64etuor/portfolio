// Per-beat scene-cut flavor, keyed by the INCOMING beat's id (else 'default').
const TX_VARIANT: Record<string, string> = {
  's6-collision': 'glitch', // 충돌 — 디지털 글리치/찢김
  's8-insight': 'weave', // 연결 — 양쪽(현업·개발)이 중앙에서 만나 봉합
  's9-bridge': 'weave', // 해결(양손잡이) — 봉합
  's10-crossdomain': 'weave', // 크로스도메인 — 봉합
  ending: 'bloom', // 엔딩 — 빛이 바깥으로 열림
}

/** Resolve the transition variant for an act id ('default' when unmapped). */
export function txVariantFor(actId: string): string {
  return TX_VARIANT[actId] ?? 'default'
}

interface FilmTransitionProps {
  /** bumps on each cut → keying on it replays the animation. 0 = no overlay yet. */
  txId: number
  txVariant: string
}

/**
 * FilmTransition — the cinematic scene-cut overlay. The key replays the animation on
 * each cut; the variant picks the flavor markup.
 */
export function FilmTransition({ txId, txVariant }: FilmTransitionProps) {
  if (txId <= 0) return null
  return (
    <div className={`film-tx film-tx--${txVariant}`} key={txId} aria-hidden>
      {txVariant === 'glitch' && (
        <>
          <div className="ftx-flash" />
          <div className="ftx-slice a" />
          <div className="ftx-slice b" />
          <div className="ftx-noise" />
        </>
      )}
      {txVariant === 'weave' && (
        <>
          <div className="ftx-wl" />
          <div className="ftx-wr" />
          <div className="ftx-merge" />
        </>
      )}
      {txVariant === 'bloom' && <div className="ftx-b" />}
      {txVariant === 'default' && (
        <>
          <div className="film-tx-bloom" />
          <div className="film-tx-slash" />
        </>
      )}
    </div>
  )
}
