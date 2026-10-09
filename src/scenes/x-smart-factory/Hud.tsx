import type { Locale } from '@/i18n/content'
import { ERP_MODULES, HUD, LINES, PANELS, PHASES, STOCK_ITEMS, SYSTEMS, WAREHOUSE_LABEL, type L } from './data'
import s from './scene.module.css'

// DOM HUD — 텍스트는 React(로케일), 위치/불투명도/숫자는 runtime 이 data-k 로 직접 갱신.
export function Hud({ locale }: { locale: Locale }) {
  const tr = (x: L) => (locale === 'en' ? x.en : x.ko)
  const panel = (key: string) => PANELS.find((p) => p.key === key)!
  return (
    <div className={s.hud} aria-hidden>
      {/* 3D 앵커 라벨 */}
      {LINES.map((ln, i) => (
        <div key={ln.kind} className={s.anchor} data-k={`ln${i}`} style={{ opacity: 0 }}>
          <span className={s.floorTag}>{tr(ln.label)}</span>
        </div>
      ))}
      <div className={s.anchor} data-k="wh" style={{ opacity: 0 }}>
        <span className={s.floorTag}>{tr(WAREHOUSE_LABEL)}</span>
      </div>

      {STOCK_ITEMS.map((it, i) => (
        <div key={it.code} className={s.anchor} data-k={`stk${i}`} style={{ opacity: 0 }}>
          <span className={s.stock}>
            <b data-k={`stc${i}`}>0</b>
            <i>EA</i>
          </span>
        </div>
      ))}

      <div className={s.anchor} data-k="pn-erp" style={{ opacity: 0 }}>
        <div className={`${s.card} ${s.cardErp}`}>
          <div className={s.cardHead}>
            <span>{tr(panel('erp').title)}</span>
            <em>{tr(panel('erp').sub)}</em>
          </div>
          <div className={s.modules}>
            {ERP_MODULES.map((m, i) => (
              <span key={m.en} data-k={`erpm${i}`} data-on="0">
                {tr(m)}
              </span>
            ))}
          </div>
          <div className={s.log}>
            {[0, 1, 2].map((j) => (
              <div key={j} data-k={`erplog${j}`}>
                LOT-0000
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={s.anchor} data-k="pn-tablet" style={{ opacity: 0 }}>
        <div className={`${s.card} ${s.cardTab}`}>
          <div className={s.cardHead}>
            <span>{tr(panel('tablet').title)}</span>
            <em>{tr(panel('tablet').sub)}</em>
          </div>
          {LINES.map((ln, i) => (
            <div key={ln.kind} className={s.barRow}>
              <span>{tr(ln.label)}</span>
              <div className={s.bar}>
                <div data-k={`tb${i}`} style={{ transform: 'scaleX(0)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={s.anchor} data-k="pn-barcode" style={{ opacity: 0 }}>
        <div className={`${s.card} ${s.cardBc}`}>
          <div className={s.cardHead}>
            <span>{tr(panel('barcode').title)}</span>
            <em>{tr(panel('barcode').sub)}</em>
          </div>
          {STOCK_ITEMS.map((it, i) => (
            <div key={it.code} className={s.stockRow}>
              <span className={s.code}>{it.code}</span>
              <span className={s.name}>{tr(it.name)}</span>
              <span className={s.qty}>
                <b data-k={`pc${i}`}>0</b> EA
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 고정 HUD */}
      <header className={s.head}>
        <div className={s.kicker}>{tr(HUD.kicker)}</div>
        <h2 className={s.title}>{tr(HUD.title)}</h2>
        <div className={s.meta}>{tr(HUD.program)}</div>
        <div className={s.meta}>
          <span className={s.period}>{tr(HUD.period)}</span>
        </div>
        <div className={s.role}>{tr(HUD.role)}</div>
      </header>

      <div className={s.systems}>
        {SYSTEMS.map((sy, i) => (
          <div key={sy.n} className={s.sys} data-k={`sys${i}`} data-on="0">
            <span className={s.sysN}>{sy.n}</span>
            <span>{tr(sy.label)}</span>
          </div>
        ))}
      </div>

      <div className={s.phases}>
        {PHASES.map((p, i) => (
          <div key={i} className={`${s.phase} ${i === 2 ? s.phaseFinal : ''}`} data-k={`ph${i}`} style={{ opacity: i === 0 ? 1 : 0 }}>
            {tr(p)}
          </div>
        ))}
      </div>
    </div>
  )
}
