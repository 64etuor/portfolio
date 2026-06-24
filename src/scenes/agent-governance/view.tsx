import type { RefCallback } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { rootBg } from './constants'
import type { SceneCtx } from './types'
import { ledClass, setEl } from './dom'
import s from './scene.module.css'

type ViewProps = {
  ctx: SceneCtx
  pipeRef: RefCallback<HTMLCanvasElement>
  hbRef: RefCallback<HTMLCanvasElement>
  graphRef: RefCallback<HTMLCanvasElement>
  lintRef: RefCallback<HTMLCanvasElement>
  onJobAccept: () => void
  onJobReject: () => void
  onApproveACP: () => void
  onDenyACP: () => void
  onKillTicker: () => void
}

/** agent-governance 씬의 대용량 정적 JSX. ref 콜백/핸들러만 주입받는 순수 뷰. */
export function View({
  ctx,
  pipeRef,
  hbRef,
  graphRef,
  lintRef,
  onJobAccept,
  onJobReject,
  onApproveACP,
  onDenyACP,
  onKillTicker,
}: ViewProps) {
  return (
    <SceneHost className={s.root} bg="#06080c" style={{ background: rootBg }} scroll>
      <div className={s.wrap} ref={ctx.rootRef}>
        <div className={s.topbar}>
          <div className={s.brand}>
            <div className={s.logo} />
            <div>
              <h1>Boule Control Room</h1>
              <div className={s.sub}>BOUNDARIES BEFORE EXECUTION · BOUNDED TICKER · EVENT-SOURCED · v2.3</div>
            </div>
          </div>
          <div className={s.spacer} />
          <div className={s['stat-strip']}>
            <div className={s.chip}>
              <span className={s.dot} />SESSION <b ref={setEl(ctx, 'sStat')}>LIVE</b>
            </div>
            <div className={s.chip}>SSOT <b>AGENTS.md</b></div>
            <div className={s.chip}>LINT <b ref={setEl(ctx, 'lintChip')}>48/48</b></div>
            <div className={s.chip}>JOBS <b ref={setEl(ctx, 'jobOk')}>0</b>✓ / <b className={s.jobFail} ref={setEl(ctx, 'jobFail')}>0</b>✗</div>
            <div className={`${s.chip} ${s.warn}`}>
              <span className={s.dot} />LATCH <b ref={setEl(ctx, 'latchCt')}>0</b>
            </div>
            <div className={s.chip}>CAPTURE <b ref={setEl(ctx, 'capCt')}>0</b>/d</div>
          </div>
          <div className={s.clock} ref={setEl(ctx, 'clock')}>--:--:--</div>
        </div>

        <div className={s.grid}>
          <section className={`${s.panel} ${s.fleet}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>FLEET</span>
              <h2>Agent Fleet · Orchestration</h2>
              <span className={s.pin} ref={setEl(ctx, 'fleetActive')}>5 types</span>
            </div>
            <div ref={setEl(ctx, 'agentList')} />

            <div className={s.registry}>
              <div className={s['reg-head']}>ServiceRegistry · lifecycle</div>
              <div ref={setEl(ctx, 'regList')} />
            </div>

            <div className={s.job}>
              <div className={s.jh}>
                ⌬ Codex Job <span className={s.jobId} ref={setEl(ctx, 'jobId')}>job#0481</span>
                <span className={s.badge} ref={setEl(ctx, 'jobBadge')}>RUNNING</span>
              </div>
              <div className={s.prog}><i ref={setEl(ctx, 'jobProg')} /></div>
              <div className={s.row}><span>timeout</span><b>900s</b></div>
              <div className={s.row}><span>maxTurns</span><b>24</b></div>
              <div className={s.row}><span>costCap</span><b ref={setEl(ctx, 'jobCost')}>$2.40 / $5.00</b></div>
              <div className={`${s.row} ${s.rowLast}`}><span>turns used</span><b ref={setEl(ctx, 'jobTurns')}>7 / 24</b></div>
              <div className={s.acts}>
                <div className={`${s.mini} ${s.accept}`} onClick={onJobAccept}>ACCEPT proposal</div>
                <div className={`${s.mini} ${s.reject}`} onClick={onJobReject}>REJECT · kill</div>
              </div>
            </div>
          </section>

          <section className={`${s.panel} ${s.pipe}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>CORE</span>
              <h2>Boule Pipeline · 경계 설계 후 실행</h2>
              <span className={s.pin} ref={setEl(ctx, 'evHead')}>e0000</span>
            </div>

            <div className={s['pipe-canvas-wrap']}>
              <canvas ref={pipeRef} className={s.pipeCanvas} />
            </div>

            <div className={s['lamp-row']}>
              <div className={s.lamp}>
                <div className={s.lab}>readiness gate</div>
                <div className={s.val}><span className={ledClass(ctx, 'ok')} ref={setEl(ctx, 'gateLed')} /><span ref={setEl(ctx, 'gateTxt')}>RELEASE</span></div>
              </div>
              <div className={s.lamp}>
                <div className={s.lab}>ticker · heartbeat</div>
                <div className={s.val}><span className={ledClass(ctx, 'ok')} ref={setEl(ctx, 'tickLed')} /><span ref={setEl(ctx, 'tickTxt')}>RUNNING</span></div>
              </div>
              <div className={s.lamp}>
                <div className={s.lab}>autonomy · bounded envelope</div>
                <div className={s.val}><span className={ledClass(ctx, 'ok')} ref={setEl(ctx, 'autLed')} /><span ref={setEl(ctx, 'autTxt')} style={{ color: 'var(--signal)' }}>FAIL-CLOSED</span></div>
              </div>
              <div className={s.lamp}>
                <div className={s.lab}>attention latch</div>
                <div className={s.val}><span className={ledClass(ctx, 'dim')} ref={setEl(ctx, 'latchLed')} /><span ref={setEl(ctx, 'latchTxt')}>armed</span></div>
              </div>
            </div>

            <div className={s['hb-wrap']}>
              <canvas className={s['hb-canvas']} ref={hbRef} />
              <div className={s['hb-bpm']} ref={setEl(ctx, 'bpm')}>72 bpm</div>
            </div>

            <div className={s['pipe-controls']}>
              <div className={s.btn} ref={setEl(ctx, 'killTicker')} onClick={onKillTicker}><span className={s.led} />KILL TICKER</div>
              <span className={s['ticker-mini']} ref={setEl(ctx, 'killNote')}>ticker 정지해도 권한 봉투는 닫힌 채 유지 — 경계는 하트비트와 무관</span>
            </div>
          </section>

          <section className={`${s.panel} ${s.know}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>KNOWLEDGE</span>
              <h2>LLM Wiki · Lineage Graph</h2>
              <span className={s.pin}>3-layer</span>
            </div>

            <div className={s['wiki-stack']}>
              <div className={s.layer}><span className={s.ln}>raw</span><span className={s.desc}>원천 캡처 — 미가공 노트/대화</span><span className={s.ct} ref={setEl(ctx, 'rawCt')}>1,284</span><span className={s.flow} data-d="0" /></div>
              <div className={s.layer}><span className={s.ln}>wiki</span><span className={s.desc}>정제 위키 — ingest · query · lint</span><span className={s.ct} ref={setEl(ctx, 'wikiCt')}>412</span><span className={s.flow} data-d="1" /></div>
              <div className={s.layer}><span className={s.ln}>schema</span><span className={s.desc}>강제 스키마 — 구조화된 진실</span><span className={s.ct} ref={setEl(ctx, 'schCt')}>96</span><span className={s.flow} data-d="2" /></div>
            </div>

            <div className={s['know-sub']}>GraphRAG · Leiden community · multi-hop</div>
            <div className={s['graph-canvas-wrap']}>
              <canvas ref={graphRef} className={s.graphCanvas} />
            </div>
            <div className={s['graph-trace']} ref={setEl(ctx, 'gtrace')}>query → multi-hop trace 대기…</div>
          </section>

          <section className={`${s.panel} ${s.human}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>HUMAN-IN-THE-LOOP</span>
              <h2>Hermes ACP · human approval gate</h2>
            </div>

            <div className={`${s.acp} ${s.pending}`} ref={setEl(ctx, 'acp')}>
              <div className={s.ah}>
                <div className={s.ic}>!</div>
                <div className={s.t}>권한 승인 요청<small>Hermes ACP · permission gate</small></div>
                <div className={s.state} ref={setEl(ctx, 'acpState')}>AWAITING</div>
              </div>
              <div className={s.q} ref={setEl(ctx, 'acpQ')}>
                에이전트가 외부 쓰기를 요청합니다 — <span className={s.k}>git push origin main</span><br />
                autonomy 봉투 밖의 작업. 사람 승인 없이는 실행되지 않습니다.
              </div>
              <div className={s.acts}>
                <div className={`${s.mini} ${s.accept}`} onClick={onApproveACP}>APPROVE · 게이트 개방</div>
                <div className={`${s.mini} ${s.reject}`} onClick={onDenyACP}>DENY · 유지</div>
              </div>
            </div>

            <div className={s.envelope}>
              <div className={`${s['reg-head']} ${s.regHeadEnvelope}`}>permission envelope · 권한 봉투</div>
              <div className={s['env-row']}><span className={ledClass(ctx, 'ok')} />read · 코드/이벤트 관측<span className={s.tail}>자율 허용</span></div>
              <div className={s['env-row']}><span className={ledClass(ctx, 'ok')} />plan · 제안 생성<span className={s.tail}>자율 허용</span></div>
              <div className={s['env-row']}><span className={ledClass(ctx, 'amber')} ref={setEl(ctx, 'envWrite')} />external write · push/배포<span className={s.tail} ref={setEl(ctx, 'envWriteTail')}>사람 게이트</span></div>
              <div className={s['env-row']}><span className={ledClass(ctx, 'amber')} ref={setEl(ctx, 'envPrio')} />priority 변경<span className={s.tail} ref={setEl(ctx, 'envPrioTail')}>사람 게이트</span></div>
            </div>
          </section>

          <section className={`${s.panel} ${s.log}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>OBSERVABILITY</span>
              <h2>Append-only Event Store</h2>
              <span className={s.pin}>SQLite · 50+ migrations</span>
            </div>
            <div className={s.logbody}>
              <div className={s.stream}>
                <div className={s.sh}>EVENT LOG <span className={s.ct} ref={setEl(ctx, 'evTotal')}>e0000</span></div>
                <div className={s.feed} ref={setEl(ctx, 'evFeed')} />
              </div>
              <div className={s.stream}>
                <div className={s.sh}>TOOL / MCP STREAM <span className={s.ct} ref={setEl(ctx, 'toolTotal')}>0</span></div>
                <div className={s.feed} ref={setEl(ctx, 'toolFeed')} />
              </div>
            </div>
          </section>

          <section className={`${s.panel} ${s.guards}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>GOVERNANCE</span>
              <h2>Named Failure-modes · stop conditions</h2>
              <span className={s.pin}>contained</span>
            </div>
            <div className={s.guard}>
              <div className={s.gh}><span className={s.led} />Schema 비대화<span className={s.st}>CONTAINED</span></div>
              <div className={s.gd}>SSOT가 모든 규칙 종착지로 비대해짐 — Hyrum's Law. net-zero 레저로 차단. <b>최소주의 = 비대화 면역력.</b></div>
              <div className={s.meter}><i style={{ width: '22%' }} /></div>
            </div>
            <div className={s.guard}>
              <div className={s.gh}><span className={s.led} />사문화 드리프트<span className={s.st}>CONTAINED</span></div>
              <div className={s.gd}>정형화됐지만 아무도 안 읽음 = 공동묘지. read_log · dead_notes 텔레메트리로 사문화를 관측.</div>
              <div className={s.meter}><i style={{ width: '14%' }} /></div>
            </div>
            <div className={s.guard}>
              <div className={s.gh}><span className={s.led} />행동적 부패<span className={s.st}>CONTAINED</span></div>
              <div className={s.gd}>형식은 살았으나 의미가 죽음 — lint로 못 잡는 부패. Instruction Review Protocol + 텔레메트리 read-side 신호로 검출, 처분은 수동.</div>
              <div className={s.meter}><i style={{ width: '9%' }} /></div>
            </div>
          </section>

          <section className={`${s.panel} ${s.vault}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>SELF-GOVERNING VAULT OS</span>
              <h2>Vault Governance · 자가통치</h2>
              <span className={s.pin}>running infra</span>
            </div>

            <div className={s['vault-grid']}>
              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>CONSTITUTION · SSOT</span><span className={s.vp}>AUTHORITATIVE</span></div>
                <div className={s['const-row']}><span className={s.led} />AGENTS.md<span className={s.h}>30KB · English-only</span></div>
                <div className={s['const-row']}><span className={s.led} />CLAUDE.md<span className={s.h}>1-line · @AGENTS.md import</span></div>
                <div className={s['const-note']}>모든 볼트-쓰기 규칙의 단일 진실원천. <b>충돌 시 이 파일이 이김</b> — 권한·중단조건·인간 게이트를 여기서 선언 후 실행.</div>
              </div>

              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>COMPILER · vault-lint.py</span><span className={s.vp} ref={setEl(ctx, 'lintPin')}>GATE PASS</span></div>
                <div className={s['gauge-wrap']}>
                  <div className={s.gauge}><canvas ref={lintRef} className={s.lintCanvas} /><div className={s.gnum} ref={setEl(ctx, 'lintNum')}>48/48</div></div>
                  <div className={s['gauge-meta']}>
                    <div className={s.gl}>frontmatter 7-field<b className={s.okText}>ok</b></div>
                    <div className={s.gl}>wikilink · tag taxonomy<b className={s.okText}>ok</b></div>
                    <div className={s.gl}>AUTOGEN drift <span className={s.h}>#34</span><b className={s.okText}>ok</b></div>
                    <div className={s.gl}>매 편집 턴 후 통과해야 <b className={s.okText}>done</b></div>
                  </div>
                </div>
              </div>

              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>NET-ZERO LEDGER · CHANGELOG</span><span className={s.vp} ref={setEl(ctx, 'nzPin')}>BALANCED</span></div>
                <div className={s.nzList} ref={setEl(ctx, 'nzList')} />
                <div className={s['nz-bal']} ref={setEl(ctx, 'nzBal')}>slug: changelog-net-zero · [A]==[R] · 비대화 거버너</div>
              </div>

              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>MAINTENANCE CRON</span><span className={s.vp} ref={setEl(ctx, 'cronPin')}>FRESH</span></div>
                <div className={s['cron-stack']}>
                  <div className={s['cron-row']}><span className={s.cn}>read_log</span><span className={s.bar}><i style={{ width: '88%' }} /></span><span className={s.age}>1d</span></div>
                  <div className={s['cron-row']}><span className={s.cn}>graph_health</span><span className={s.bar}><i style={{ width: '62%' }} /></span><span className={s.age}>3d</span></div>
                  <div className={s['cron-row']}><span className={s.cn}>dead_notes</span><span className={s.bar}><i className={s.due} style={{ width: '24%' }} /></span><span className={s.age}>due</span></div>
                  <div className={s['cron-row']}><span className={s.cn}>status_aging</span><span className={s.bar}><i style={{ width: '71%' }} /></span><span className={s.age}>2d</span></div>
                </div>
                <div className={s['cron-foot']}>run_due_maintenance.py · CADENCE_DAYS+state · 의존성 순서 · 매주 월 <b>06:00 cron</b></div>
              </div>

              <div className={`${s.vcard} ${s.wide2}`}>
                <div className={s.vch}><span className={s.vt}>TELEMETRY · read-side 5-signal</span><span className={s.vp}>MEASURED</span></div>
                <div className={s['sig-row']}>
                  <div className={s.sig} data-sig="0"><span className={s.sled} /><span className={s.sn}>read_log</span><span className={s.sv} ref={setEl(ctx, 'sig0')}>1.2k</span></div>
                  <div className={s.sig} data-sig="1"><span className={s.sled} /><span className={s.sn}>dead_notes</span><span className={s.sv} ref={setEl(ctx, 'sig1')}>7</span></div>
                  <div className={s.sig} data-sig="2"><span className={s.sled} /><span className={s.sn}>status_aging</span><span className={s.sv} ref={setEl(ctx, 'sig2')}>3</span></div>
                  <div className={s.sig} data-sig="3"><span className={s.sled} /><span className={s.sn}>graph_health</span><span className={s.sv} ref={setEl(ctx, 'sig3')}>94</span></div>
                  <div className={s.sig} data-sig="4"><span className={s.sled} /><span className={s.sn}>knowledge_gap</span><span className={s.sv} ref={setEl(ctx, 'sig4')}>12</span></div>
                </div>
                <div className={s['sig-note']}>graph_health = god-notes · hub-overload · echo-chambers / knowledge_gap = 끊긴 wikilink 랭킹 → <b>다음에 쓸 것</b>. 측정은 자동, 판결은 아님.</div>
              </div>

              <div className={`${s.vcard} ${s.wide2}`}>
                <div className={s.vch}><span className={s.vt}>INSTRUCTION REVIEW PROTOCOL · audit append-only</span><span className={`${s.vp} ${s.amber}`} ref={setEl(ctx, 'auditPin')}>HUMAN-REVIEW</span></div>
                <div className={s['audit-feed']} ref={setEl(ctx, 'auditFeed')} />
                <div className={s['sig-note']}>stale 규칙은 <b>절대 조용히 수정 안 함</b> → 000_System/audits/instruction-review.md 에 append. [llm] 제안 vs [auto] 감지 — 처분은 사람이.</div>
              </div>
            </div>
          </section>
        </div>

        <div className={s.footer}>
          <div className={s.who}>Boule Governance Doctrine
            <small>경계 설계 → 인간 게이트 → fail-closed 복귀 · 이벤트 소싱 단일 진실원천</small>
          </div>
          <div className={s.impact}>
            <div className={s.imp}><b>FAIL-CLOSED</b><span>autonomy 기본값</span></div>
            <div className={s.imp}><b>48/48</b><span>vault-lint 게이트</span></div>
            <div className={s.imp}><b>1-SSOT</b><span>AGENTS.md 단일원천</span></div>
            <div className={s.imp}><b>append-only</b><span>이벤트 · 감사 로그</span></div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
