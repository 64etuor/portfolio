// Work Radar — radar-sonar 씬 정적 JSX (콕핏 셸). 상호작용 핸들러는 props 로 주입.

import type { RefCallback } from 'react'
import s from './scene.module.css'
import { SURFACE_STACK } from './data'
import type { SceneRefs } from './types'

interface RadarViewProps {
  refs: SceneRefs
  setCanvasRef: RefCallback<HTMLCanvasElement>
  onFilterToggle: (
    type: 'signal' | 'surface' | 'agent' | 'gate',
    rowRef: React.RefObject<HTMLDivElement | null>,
  ) => () => void
  onPing: () => void
  onCloseDetail: () => void
  onDetailBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function RadarView({
  refs,
  setCanvasRef,
  onFilterToggle,
  onPing,
  onCloseDetail,
  onDetailBackdropClick,
}: RadarViewProps) {
  return (
    <div className={s.shell}>
      {/* TOP BAR */}
      <header className={s.topbar}>
        <div className={s.tag}>
          <span className={s.tagK}>MODE</span>
          <span className={s.tagV}>PPI / SCAN</span>
        </div>
        <div className={s.tag}>
          <span className={s.tagK}>SIGNALS</span>
          <span className={s.tagV}><span ref={refs.hudRangeRef}>11 CH</span></span>
        </div>
        <div className={s.tag}>
          <span className={s.tagK}>AUTONOMY</span>
          <span className={`${s.tagV} ${s.tagVAmb}`}>BOUNDED</span>
        </div>
        <div className={s.tag}>
          <span className={s.tagK}>GATE</span>
          <span className={s.tagV}>HUMAN</span>
        </div>
        <div className={s.tag}>
          <span className={s.tagK}>SWEEP</span>
          <span className={s.tagV}><span ref={refs.hudBearingRef}>000°</span></span>
        </div>
        <div className={s.tag}>
          <span className={s.tagK}>CONTACTS</span>
          <span className={`${s.tagV} ${s.tagVAmb}`}><span ref={refs.hudContactsRef}>0 / 20</span></span>
        </div>
        <div className={s.tag} ref={refs.hudPhaseTagRef} title="Work Radar -- Boule Governance readiness gate">
          <span className={s.tagK}>SURFACE</span>
          <span className={`${s.tagV} ${s.tagVCyn}`}><span ref={refs.hudPhaseRef}>S0 · CAPTURE BOARD</span></span>
        </div>
        <div className={s.tag}>
          <span className={s.tagK}>LOCKED</span>
          <span className={s.tagV}><span ref={refs.hudVerifiedRef}>0 / 20</span></span>
        </div>
        <div className={s.topbarSys}>
          <span className={s.topbarTitle}><b>WORK RADAR</b> COCKPIT</span>
          <span className={s.blink} />
          <span className={s.topbarOnline}>ONLINE</span>
        </div>
      </header>

      {/* LEFT PANEL */}
      <aside className={s.left}>
        <div className={s.ident}>
          <span className={`${s.corner} ${s.cornerTl}`} />
          <span className={`${s.corner} ${s.cornerTr}`} />
          <span className={`${s.corner} ${s.cornerBl}`} />
          <span className={`${s.corner} ${s.cornerBr}`} />
          <div className={s.identName}>WORK RADAR</div>
          <div className={s.identEn}>OPERATOR</div>
          <div className={s.identRole}>Work Radar · local-first AI 워크플로우 관제 콕핏</div>
        </div>

        <div className={s.sectionH}>SIGNAL CLASS <span>FILTER</span></div>
        <div className={s.legend}>
          <div className={s.legendRow} ref={refs.legendSignalRef} onClick={onFilterToggle('signal', refs.legendSignalRef)}>
            <span className={s.legendSym}>
              <svg width="20" height="20"><circle cx="10" cy="10" r="3.5" fill="#2effa3"/><circle cx="10" cy="10" r="6.5" fill="none" stroke="#2effa3" strokeWidth="1.4"/></svg>
            </span>
            <span className={s.legendLbl}>외부 신호 SIGNAL</span>
            <span className={s.legendCnt} ref={refs.cntSignalRef}>0</span>
          </div>
          <div className={s.legendRow} ref={refs.legendSurfaceRef} onClick={onFilterToggle('surface', refs.legendSurfaceRef)}>
            <span className={s.legendSym}>
              <svg width="20" height="20"><rect x="5" y="5" width="10" height="10" fill="none" stroke="#3fe0ff" strokeWidth="1.4"/><rect x="7" y="7" width="6" height="6" fill="rgba(63,224,255,0.4)"/></svg>
            </span>
            <span className={s.legendLbl}>운영 서피스 SURFACE</span>
            <span className={s.legendCnt} ref={refs.cntSurfaceRef}>0</span>
          </div>
          <div className={s.legendRow} ref={refs.legendAgentRef} onClick={onFilterToggle('agent', refs.legendAgentRef)}>
            <span className={s.legendSym}>
              <svg width="20" height="20"><path d="M10 3 L17 10 L10 17 L3 10 Z" fill="rgba(255,176,49,0.4)" stroke="#ffb031" strokeWidth="1.4"/></svg>
            </span>
            <span className={s.legendLbl}>에이전트 AGENT</span>
            <span className={s.legendCnt} ref={refs.cntAgentRef}>0</span>
          </div>
          <div className={s.legendRow} ref={refs.legendGateRef} onClick={onFilterToggle('gate', refs.legendGateRef)}>
            <span className={s.legendSym}>
              <svg width="20" height="20"><circle cx="10" cy="10" r="6" fill="none" stroke="#fff" strokeWidth="1.4"/><path d="M6 10 L9 13 L14 6" fill="none" stroke="#fff" strokeWidth="1.6"/></svg>
            </span>
            <span className={s.legendLbl}>거버넌스 GATE</span>
            <span className={s.legendCnt} ref={refs.cntGateRef}>0</span>
          </div>
        </div>

        <div className={s.sectionH}>SURFACE STACK <span>운영 레이어</span></div>
        <div className={s.ladder}>
          {SURFACE_STACK.map((item, i) => (
            <div
              key={item.px}
              className={s.lad}
              ref={(el) => { refs.ladRefs.current[i] = el }}
            >
              <span className={s.ladPx}>{item.px}</span>
              <span className={s.ladPl}>{item.label}<small>{item.sub}</small></span>
            </div>
          ))}
          <div className={s.ladRule}>▲ 자동화 많을수록 인간 가시성 확보</div>
        </div>

        <div className={s.creed}>
          <div className={s.creedQ}>
            "자동화가 많아질수록, <b>인간이 운영 상태를 이해하고 멈출 수 있게</b> 정보를 아키텍처한다."
          </div>
          <div className={s.creedR}>
            BOULE GOVERNANCE · tick_enabled · max_steps · autonomy_level · 인간 승인 게이트
          </div>
        </div>

        <div className={s.sectionH}>SENSOR STATUS</div>
        <div className={s.hudGrid}>
          <div className={s.hudCell}>
            <div className={s.hudCellK}>DETECTED</div>
            <div className={s.hudCellV}><span ref={refs.liveDetRef}>0</span><small>/20</small></div>
          </div>
          <div className={`${s.hudCell} ${s.hudCellAmb}`}>
            <div className={s.hudCellK}>PRIORITY</div>
            <div className={s.hudCellV}><span ref={refs.livePriRef}>0</span><small>SIG</small></div>
          </div>
          <div className={s.hudCell}>
            <div className={s.hudCellK}>SWEEP RPM</div>
            <div className={s.hudCellV}>12<small>rpm</small></div>
          </div>
          <div className={s.hudCell}>
            <div className={s.hudCellK}>PERSIST</div>
            <div className={s.hudCellV}>4.5<small>s</small></div>
          </div>
          <div className={s.hudCell}>
            <div className={s.hudCellK}>LOCKED</div>
            <div className={s.hudCellV}><span ref={refs.liveResRef}>0</span><small>sig</small></div>
          </div>
          <div className={`${s.hudCell} ${s.hudCellAmb}`}>
            <div className={s.hudCellK}>GATE</div>
            <div className={s.hudCellV}>HUMAN</div>
          </div>
        </div>
      </aside>

      {/* CENTER SCOPE */}
      <main className={s.scopeWrap}>
        <canvas ref={setCanvasRef} className={s.c} />
        <div className={s.scopeOverlay}>
          <div className={`${s.ovCorner} ${s.ovCornerTl}`}>
            SCOPE-01 <b>ACTIVE</b><br />Work Radar v0.1<br />local-first desktop
          </div>
          <div className={`${s.ovCorner} ${s.ovCornerTr}`}>
            SCAN <b>360°</b> CONTINUOUS<br />BOULE GATE <b>ON</b><br />Tauri 2 · Rust · SQLite
          </div>
          <div className={`${s.ovCorner} ${s.ovCornerBl}`}>
            CURSOR<br /><span ref={refs.curBrgRef}>BRG ---°</span><br /><span ref={refs.curRngRef}>RNG -- NM</span>
          </div>
          <div className={`${s.ovCorner} ${s.ovCornerBr}`}>
            SIG LOCK<br /><b><span ref={refs.lockStateRef}>STANDBY</span></b><br /><span ref={refs.lockIdRef}>--</span><br /><span ref={refs.lockVerdictRef} style={{ color: '#4f9a7a' }}>STATUS --</span>
          </div>
        </div>
        <button
          className={s.pingBtn}
          onClick={onPing}
        >
          ▷ ACTIVE PING (SIGNAL SCAN)
        </button>
      </main>

      {/* RIGHT TRACK TABLE */}
      <aside className={s.right}>
        <div className={s.rightHead}>
          <div className={s.rightHeadT}>SIGNAL TRACK TABLE</div>
          <div className={s.rightHeadS}>들어오는 작업 신호 탐지 · 서피스 배정 · 락온</div>
        </div>
        <div className={s.trackHead}>
          <span>TRK#</span><span>BRG</span><span>RNG</span><span>SURF</span><span>ID · STATUS</span>
        </div>
        <div className={s.trackBody} ref={refs.trackBodyRef} />
        <div className={s.rightFoot}>COMMS · WORK RADAR</div>
      </aside>

      {/* BOTTOM STATUS */}
      <footer className={s.statusbar}>
        <div className={s.statusSeg}>SYS<b>NOMINAL</b></div>
        <div className={s.statusSeg}>STACK<b>Tauri/Rust</b></div>
        <div className={s.statusSeg}>DB<b>SQLite</b></div>
        <div className={s.statusTicker}>
          <span className={s.statusTickerSpan} ref={refs.tickerRef}>
            Work Radar -- 캘린더 PR Notion 백로그 worktree AI agent 세션 루틴이 서로 다른 속도로 들어올 때, 지금 무엇을 봐야 하는지를 잃지 않게 하는 local-first 데스크톱 관제 콕핏 · Boule Governance: tick_enabled interval_sec max_steps autonomy_level · 인간 승인 게이트
          </span>
        </div>
        <div className={s.statusSeg}>UTC<b><span ref={refs.clockRef}>--:--:--</span></b></div>
      </footer>

      {/* DETAIL MODAL */}
      <div className={s.detail} ref={refs.detailRef} onClick={onDetailBackdropClick}>
        <div className={s.detailCard}>
          <span className={`${s.dcCorner} ${s.dcCornerTl}`} />
          <span className={`${s.dcCorner} ${s.dcCornerTr}`} />
          <span className={`${s.dcCorner} ${s.dcCornerBl}`} />
          <span className={`${s.dcCorner} ${s.dcCornerBr}`} />
          <div className={s.dcHead}>
            <div>
              <div className={s.dcTrkno} ref={refs.dcTrkRef}>TRK-00</div>
              <div className={s.dcId} ref={refs.dcIdRef}>--</div>
              <div className={s.dcSub} ref={refs.dcSubRef}>--</div>
            </div>
            <button className={s.dcClose} onClick={onCloseDetail}>×</button>
          </div>
          <div className={s.dcSolution}>
            <div className={s.dcSolCell}><div className={s.dcSolK}>BEARING</div><div className={s.dcSolV} ref={refs.dcBrgRef}>000°</div></div>
            <div className={s.dcSolCell}><div className={s.dcSolK}>RANGE</div><div className={s.dcSolV} ref={refs.dcRngRef}>0 NM</div></div>
            <div className={s.dcSolCell}><div className={s.dcSolK}>CLASS</div><div className={s.dcSolV} ref={refs.dcClassRef}>--</div></div>
            <div className={s.dcSolCell}><div className={s.dcSolK}>CONF</div><div className={s.dcSolV} ref={refs.dcConfRef}>99%</div></div>
          </div>
          <div className={s.dcBody}>
            <div className={s.dcVerdict} ref={refs.dcVerdictRef} />
            <div className={s.dcDesc} ref={refs.dcDescRef} />
            <div className={s.dcAch} ref={refs.dcAchRef} />
            <div className={s.dcTags} ref={refs.dcTagsRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
