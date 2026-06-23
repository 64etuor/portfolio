// db-architecture — static scene shell (JSX only, no logic).
// All dynamic DOM is built imperatively in runtime.ts against the data-id anchors below.
// Visuals/markup identical to the original Scene.tsx inline JSX.

import s from './scene.module.css'

export function SceneShell() {
  return (
    <div className={s.app}>
      {/* ============ HEADER ============ */}
      <header className={s.header}>
        <div className={s.brand}>
          <div className={s.logo}>db</div>
          <div>
            <div>
              data<b>·</b>studio <span style={{ color: 'var(--dim)', fontWeight: 500 }}>/ schema.lab</span>
            </div>
            <div className={`${s.sub} ${s.mono}`}>DB 모델링 &amp; 데이터 아키텍처</div>
          </div>
        </div>
        <div className={s.tabs}>
          <button className={`${s.tab} ${s.active}`} data-view="erd">
            <span className={s.idx}>01</span> 도메인 ERD
          </button>
          <button className={s.tab} data-view="arch">
            <span className={s.idx}>02</span> 데이터 아키텍처
          </button>
          <button className={s.tab} data-view="sm">
            <span className={s.idx}>03</span> 상태머신 · 재귀쿼리
          </button>
        </div>
        <div className={s.spacer} />
        <div className={s.metaPill}>
          <span className={`${s.dot} ${s.live}`} /> <span data-id="engineLbl">PostgreSQL engine</span>
        </div>
        <div className={s.metaPill}>
          connected: <span style={{ color: 'var(--acc)' }}>local.dev</span>
        </div>
      </header>

      {/* ============ MAIN ============ */}
      <main className={s.main}>
        {/* ===== VIEW 1: ERD ===== */}
        <section className={`${s.view} ${s.active}`} data-id="view-erd">
          <div className={s.erdShell}>
            {/* tree */}
            <aside className={s.tree}>
              <h4>schema model</h4>
              <div className={s.modelSwitch} data-id="modelSwitch" />
              <h4 style={{ paddingTop: 4 }}>tables</h4>
              <div className={s.treeList} data-id="treeList" />
            </aside>

            {/* canvas */}
            <div className={s.canvasWrap} data-id="canvasWrap">
              <div className={s.erdCanvas} data-id="erdCanvas">
                <svg className={s.relSvg} data-id="relSvg" />
                <div data-id="tableLayer" />
              </div>
              <div className={s.zoombar}>
                <button className={s.zb} data-id="zin">
                  +
                </button>
                <button className={s.zb} data-id="zout">
                  &#8722;
                </button>
                <button className={s.zb} data-id="zfit">
                  &#10626;
                </button>
              </div>
              <div className={s.hint}>
                drag <b>캔버스</b> 패닝 · scroll <b>줌</b> · click <b>테이블 -&gt; DDL</b>
              </div>
              <div className={s.modelCaption} data-id="modelCaption" />
              <div className={s.erdStats}>
                <div className={s.erdStat}>
                  <span className={s.lbl}>예시 rows</span>
                  <span className={s.val} data-id="erdRows">
                    --
                  </span>
                </div>
                <div className={s.erdStat}>
                  <span className={s.lbl}>예시 qps</span>
                  <span className={`${s.val} ${s.blue}`} data-id="erdQps">
                    --
                  </span>
                </div>
                <div className={s.erdStat}>
                  <span className={s.lbl}>예시 active tx</span>
                  <span className={`${s.val} ${s.gold}`} data-id="erdTx">
                    --
                  </span>
                </div>
                <div className={s.erdStat}>
                  <span className={s.lbl}>예시 repl lag</span>
                  <span className={s.val} data-id="erdLag">
                    --
                  </span>
                </div>
              </div>
            </div>

            {/* DDL */}
            <aside className={s.ddl}>
              <div className={s.ddlH}>
                <span className={s.tg}>DDL</span>
                <span className={`${s.ti} ${s.mono}`} data-id="ddlTitle">
                  &#8212;
                </span>
                <button className={s.copy} data-id="copyBtn">
                  copy
                </button>
              </div>
              <div className={s.ddlBody}>
                <pre className={s.code} data-id="ddlCode" />
              </div>
              <div className={s.relsNote}>
                <h5>relationships</h5>
                <div data-id="relList" />
              </div>
            </aside>
          </div>
        </section>

        {/* ===== VIEW 2: ARCHITECTURE ===== */}
        <section className={s.view} data-id="view-arch">
          <div className={s.arch}>
            <div className={s.archHead}>
              <div>
                <h2>
                  공정 데이터 <span className={s.em}>수집 → 정규화 DB → Power BI</span> 파이프라인
                </h2>
                <p>
                  엑셀 파편화(생산일보·공수·불량 각개 관리) 안티패턴을 제거.{' '}
                  <b style={{ color: 'var(--acc)' }}>PostgreSQL 정규화 DB</b>(1NF/2NF/3NF)에 단일 입력하고, 자체개발 MES가 OPC UA 설비 데이터와 계층형 S/N 바코드를 연결 — Power BI에서 공수·생산현황·불량 리스크 범위를 투명하게 집계.
                </p>
              </div>
              <div className={s.archCtrl}>
                <button className={s.btn} data-id="archSpeed">
                  speed: 1x
                </button>
                <button className={`${s.btn} ${s.primary}`} data-id="archToggle">
                  &#9646;&#9646; pause flow
                </button>
              </div>
            </div>

            <div className={s.archStage} data-id="archStage">
              <svg className={s.flowSvg} data-id="flowSvg" />

              <aside className={s.archAside}>
                <div className={s.card}>
                  <h6>&#10007; anti-pattern</h6>
                  <p>
                    <b style={{ color: 'var(--red)' }}>엑셀 파편화</b>: 생산일보·공수·불량을 각기 다른 파일로 관리 — 집계 오류·중복·추적 불가.
                  </p>
                </div>
                <div className={s.card}>
                  <h6>정규화 설계 근거</h6>
                  <p>1NF/2NF/3NF 준수. PK/FK 명시, UNIQUE·partial index·CHECK 제약으로 중복과 상태 오류를 DB 레벨에서 차단.</p>
                  <span className={s.tag}>1NF/2NF/3NF</span>
                  <span className={s.tag}>PK/FK</span>
                  <span className={s.tag}>PostgreSQL</span>
                </div>
                <div className={s.card}>
                  <h6>S/N 추적성</h6>
                  <p>
                    시리얼 번호 기반 조회로 <b style={{ color: 'var(--acc2)' }}>불량 리스크 범위</b> 측정 가능. 필드 원자재 불량 재발 방지.
                  </p>
                </div>
              </aside>

              <div className={s.counter}>
                <div className={`${s.big} ${s.mono}`} data-id="evtCount">
                  0
                </div>
                <div className={s.lbl}>records committed &#8594; Power BI</div>
              </div>

              <div className={s.cdcLogWrap} data-id="cdcLogWrap">
                <div className={s.cdcLogHead}>
                  <span className={`${s.dot} ${s.live}`} />
                  예시 변경 이벤트
                  <b data-id="cdcLogTag">MES / PostgreSQL</b>
                  <span className={`${s.qps} ${s.mono}`} data-id="cdcQps">
                    예시 -- evt/s
                  </span>
                </div>
                <div className={s.cdcLogBody} data-id="cdcLogBody" />
              </div>

              <div className={s.legend}>
                <span>
                  <i style={{ background: 'var(--acc)' }} />
                  DB 입력
                </span>
                <span>
                  <i style={{ background: 'var(--acc2)' }} />
                  OPC UA 수집
                </span>
                <span>
                  <i style={{ background: 'var(--gold)' }} />
                  PostgreSQL 저장
                </span>
                <span>
                  <i style={{ background: 'var(--viol)' }} />
                  Power BI 출력
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== VIEW 3: STATE MACHINE + RECURSIVE ===== */}
        <section className={s.view} data-id="view-sm">
          <div className={s.smShell}>
            {/* LEFT: state machine */}
            <div className={`${s.pane} ${s.left}`}>
              <div className={s.paneH}>
                <h3>
                  <span className={s.em}>work_order</span> 상태머신
                </h3>
                <p className={s.mono}>OPEN &#8594; IN_PROGRESS &#8594; COMPLETED · HOLD/retry</p>
              </div>
              <div className={s.paneBody}>
                <svg className={s.smSvg} data-id="smSvg" viewBox="0 0 560 420" preserveAspectRatio="xMidYMid meet" />
                <div className={s.smInfo}>
                  <h6>current row · work_order</h6>
                  <div className={s.row}>
                    wo_no <b className={s.mono}>23P30027KMDA1</b>
                  </div>
                  <div className={s.row}>
                    status{' '}
                    <b className={`${s.cur} ${s.mono}`} data-id="smState">
                      OPEN
                    </b>
                  </div>
                  <div className={s.row}>
                    retry_count{' '}
                    <b className={s.mono} data-id="smRetry">
                      0
                    </b>
                  </div>
                  <div className={s.row}>
                    next_retry_ts{' '}
                    <b className={s.mono} data-id="smNext">
                      &#8212;
                    </b>
                  </div>
                </div>
                <div className={s.smCtrl}>
                  <button className={`${s.btn} ${s.primary}`} data-id="smStep">
                    &#9654; step transition
                  </button>
                  <button className={s.btn} data-id="smFail">
                    &#9889; inject failure
                  </button>
                  <button className={s.btn} data-id="smReset">
                    reset
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: recursive query */}
            <div className={s.pane}>
              <div className={s.paneH}>
                <h3>
                  <span className={s.em}>WITH RECURSIVE</span> · BOM 다단계 전개
                </h3>
                <p className={s.mono}>bom_line(id PK, parent_id FK-&gt;id, component_no, qty_per)</p>
              </div>
              <div className={s.recTop}>
                <pre data-id="recSql" />
              </div>
              <div className={s.recCanvas}>
                <svg className={s.recSvg} data-id="recSvg" viewBox="0 0 560 300" preserveAspectRatio="xMidYMid meet" />
                <div className={s.lvlBadge}>
                  recursion depth: <b data-id="recDepth">0</b>
                </div>
                <div className={s.recCtrl}>
                  <button className={`${s.btn} ${s.primary}`} data-id="recRun">
                    &#9654; run recursive CTE
                  </button>
                  <button className={s.btn} data-id="recReset">
                    reset
                  </button>
                </div>
              </div>
              <div className={s.depthStrip}>
                <span className={s.chip}>
                  covering index <b>(parent_id, id)</b>
                </span>
                <span className={s.chip}>
                  partial index <b>WHERE parent_id IS NULL</b>
                </span>
                <span className={s.chip}>expanded_qty = levels(n-1) × qty_per</span>
                <span className={s.chip}>anchor + UNION ALL</span>
                <span className={s.chip}>
                  Make/Buy <b>E / EP / SC</b> 분류
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className={s.footer}>
        <div className={`${s.seg} ${s.accent}`} data-id="footView">
          01 · ERD
        </div>
        <div className={s.seg} data-id="footEngine">
          PostgreSQL · 정규화 MES 스키마
        </div>
        <div className={s.seg} data-id="footTbl">
          tables: --
        </div>
        <div className={s.seg}>MES 공정기술 · DB 아키텍처</div>
        <div className={s.spacer} style={{ flex: 1 }} />
      </footer>
    </div>
  )
}
