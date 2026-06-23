// Decision OS — static JSX subtree extracted from Scene.tsx.
// Pure markup: no props, no state. The imperative effect in Scene.tsx wires it
// up by id/class selectors against the ref container. Output is byte-identical
// to the inline JSX it replaced.
import type { RefObject } from 'react'

export function DecisionOSView({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="wrap" ref={rootRef}>
      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">
          <div className="logo">
            <svg viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="9" r="3" fill="#4fd6c8" />
              <circle cx="10" cy="22" r="2.4" fill="#9fb0c4" />
              <circle cx="26" cy="22" r="2.4" fill="#9fb0c4" />
              <circle cx="26" cy="30" r="2" fill="#62768c" />
              <path d="M18 12 L10 19.5 M18 12 L26 19.5 M26 24.4 L26 28" stroke="#1f6058" strokeWidth="1.3" />
            </svg>
          </div>
          <div>
            <h1>
              Decision <b>OS</b> — 가치 변위 콘솔
            </h1>
            <div className="sub">DECISION-TREE ARCHITECT · DAG=SSOT · GATE→SCORE→CAP→TIEBREAKER · DETERMINISTIC</div>
          </div>
        </div>
        <div className="spacer" />
        <div className="stat-strip">
          <div className="chip">
            <span className="dot" />
            nodes <b id="cNodes">8</b>
          </div>
          <div className="chip">
            <span className="dot" />
            edges <b id="cEdges">9</b>
          </div>
          <div className="chip warn">
            <span className="dot" />
            hidden_dep <b id="cHidden">2</b>
          </div>
          <div className="chip">
            ledger <b id="cLedger">6</b>
          </div>
        </div>
        <div className="clock" id="clock">
          --:--:--
        </div>
      </div>

      {/* TENET */}
      <div className="tenet">
        <div className="q">
          &quot;모든 결정은 <em>가치 변위(value displacement)</em>다 — Positive와 Negative를 반드시 명시하고 트레이드오프를 숨기지 마라.&quot;
        </div>
        <div className="by">
          좋은 결정은 결론의 정확성이 아니라,
          <br />
          결정이 놓인 <span style={{ color: 'var(--signal)' }}>구조의 정직함</span>에서 나온다.
        </div>
      </div>

      {/* GRID */}
      <div className="grid">
        {/* CONTEXT SELECTOR */}
        <section className="panel" id="ctx">
          <div className="corner" />
          <div className="ph">
            <span className="tag">STEP 0</span>
            <h2>문제 분류 · 좌표계 설정</h2>
            <span className="pin" id="ctxPin">
              CYNEFIN
            </span>
          </div>
          <div className="ctx-lead">
            첫 결정은 결론이 아니라 문제를 <b>분류</b>하는 것 — 좌표계가 틀리면 이후 분석이 다 무너진다. 컨텍스트를 바꾸면 동일 노드의 권고 경로가 변한다.
          </div>
          <div className="seg" id="cynefinSeg">
            <button data-c="clear">CLEAR</button>
            <button data-c="complicated" className="on">
              COMPLICATED
            </button>
            <button data-c="complex">COMPLEX</button>
            <button data-c="chaotic">CHAOTIC</button>
          </div>
          <div className="ctx-card">
            <div className="k">Stacey · 합의×확실성</div>
            <div className="v" id="staceyTxt">
              합의 높음 · 확실성 중간 → <b>분석적(analyzable)</b> 영역. 전문가 판단 + 모범사례 적용.
            </div>
          </div>
          <div className="ctx-domain" id="ctxDomain" />
          <div className="ctx-stack">
            <div className="stack-lab">의사결정 스택 (레이어드 · 대체 아님)</div>
            <div className="stack-flow" id="stackFlow" />
          </div>
        </section>

        {/* DAG CANVAS */}
        <section className="panel" id="dag">
          <div className="corner" />
          <div className="ph">
            <span className="tag">CANONICAL DAG</span>
            <h2>의사결정 트리 · 의존성(topological) 순서</h2>
          </div>
          <div className="dag-toolbar">
            <button className="btn primary" id="runBtn">
              <span className="led" />
              RUN 스코어링
            </button>
            <button className="btn" id="resetView">
              뷰 리셋
            </button>
            <button className="btn" id="pruneBtn" title="추정 기반 pruning 시도">
              prune (추정)
            </button>
            <div className="dag-legend">
              <span>
                <i style={{ background: 'var(--signal)' }} />
                decided
              </span>
              <span>
                <i style={{ background: 'var(--amber)' }} />
                deferred
              </span>
              <span>
                <i style={{ background: 'var(--violet)' }} />
                type-1(비가역)
              </span>
              <span>
                <i style={{ background: 'var(--line3)' }} />
                proposed
              </span>
            </div>
          </div>
          <div className="canvas-shell" id="canvasShell">
            <svg id="dagSvg" />
            <div className="rankflag" id="rankFlag">
              RANK 모드 · y=결정론적 점수순
            </div>
            <div className="canvas-hud" id="dagHud">
              DAG = SSOT · tree = projection
              <br />
              drag=pan · scroll=zoom
            </div>
            <div className="canvas-note">실선 = dependency_edge · 점선 = hidden_dependency_edge (정보손실 추적, 숨기지 않음)</div>
          </div>
        </section>

        {/* DETAIL (spans two rows) */}
        <section className="panel" id="detail">
          <div className="corner" />
          <div className="ph">
            <span className="tag">NODE</span>
            <h2>노드 상세 · 가치 변위 &amp; 스코어</h2>
            <span className="pin" id="detRank">
              rank #1
            </span>
          </div>
          <div className="det-id" id="detId">
            decision · <b>D-—</b>
          </div>
          <div className="det-title" id="detTitle">
            —
          </div>
          <div className="det-state" id="detPills" />
          <div className="det-desc" id="detDesc">
            —
          </div>

          <div className="sect-lab">가치 변위 — Value Displacement</div>
          <div className="vd">
            <div className="vd-col pos">
              <div className="vh">
                <span className="sgn">▲</span>POSITIVE
              </div>
              <ul id="vdPos" />
            </div>
            <div className="vd-col neg">
              <div className="vh">
                <span className="sgn">▼</span>NEGATIVE
              </div>
              <ul id="vdNeg" />
            </div>
          </div>

          <div className="sect-lab">Magnitude = Scale × Reversibility</div>
          <div className="mag">
            <div className="mag-top">
              <div className="mf">
                magnitude = scale <b>×</b> reversibility
              </div>
              <div className="mval">
                <span id="magVal">—</span>
                <small> / 100</small>
              </div>
            </div>
            <div className="mag-bars">
              <div className="mbar">
                <span className="ml">scale</span>
                <div className="mt">
                  <div className="mfill scale" id="magScale" />
                </div>
                <span className="mn" id="magScaleN">
                  —
                </span>
              </div>
              <div className="mbar">
                <span className="ml">irreversibility</span>
                <div className="mt">
                  <div className="mfill rev" id="magRev" />
                </div>
                <span className="mn" id="magRevN">
                  —
                </span>
              </div>
            </div>
          </div>

          <div className="sect-lab">5축 결정론적 스코어</div>
          <div className="axes" id="axes" />

          <div className="sect-lab">권고 경로 — Context-driven</div>
          <div className="reco">
            <div className="rl">
              RECOMMENDATION · <span id="recoCtx">COMPLICATED</span>
            </div>
            <div className="rt" id="recoTxt">
              —
            </div>
            <div className="rsub" id="recoSub">
              —
            </div>
          </div>
        </section>

        {/* PIPELINE */}
        <section className="panel" id="pipe">
          <div className="corner" />
          <div className="ph">
            <span className="tag">DETERMINISTIC</span>
            <h2>Gate → Score → Cap → Tiebreaker</h2>
          </div>
          <div className="pl-lead">
            같은 입력 = 같은 출력. 4단계 결정론적 파이프라인이 노드를 <code>RUN</code> 시 재랭크한다. 두 번 실행해도 해시가 동일하다.
          </div>
          <div className="pl-stages">
            <div className="pl-stage" id="st0">
              <div className="sweep" />
              <div className="si">①</div>
              <div className="sn">GATE</div>
              <div className="sd">사전조건/의존성 충족 검사. 미충족 → 차단</div>
            </div>
            <div className="pl-stage" id="st1">
              <div className="sweep" />
              <div className="si">②</div>
              <div className="sn">SCORE</div>
              <div className="sd">5축 가중합 (고정 가중치)</div>
            </div>
            <div className="pl-stage" id="st2">
              <div className="sweep" />
              <div className="si">③</div>
              <div className="sn">CAP</div>
              <div className="sd">비가역 위험 상한 적용</div>
            </div>
            <div className="pl-stage" id="st3">
              <div className="sweep" />
              <div className="si">④</div>
              <div className="sn">TIEBREAK</div>
              <div className="sd">동점 → 위상순서·ID로 결정론 해소</div>
            </div>
          </div>
          <div className="pl-rank">
            <div className="rh">
              <span className="nm">node</span>
              <span>gate</span>
              <span>score</span>
              <span>cap</span>
            </div>
            <div id="rankBody" />
          </div>
          <div className="pl-foot">
            <span className="hash">det_hash:</span>
            <span id="detHash">—</span>
          </div>
        </section>

        {/* LEDGER */}
        <section className="panel" id="ledg">
          <div className="corner" />
          <div className="ph">
            <span className="tag">APPEND-ONLY</span>
            <h2>Decision Ledger · 인간 편집 보호</h2>
            <span className="pin">NON-OVERWRITING</span>
          </div>
          <div className="ledg-head">
            <div className="lt">
              <b>Proposed</b> → Decided → Superseded
            </div>
            <div className="lt">
              Reconcile <b>before</b> creating
            </div>
            <div className="lt">
              Last Edited At &gt; Last Agent Sync At ⇒ <b>protect</b>
            </div>
          </div>
          <div className="ledg-cols">
            <div className="ledg-list" id="ledgerList" />
            <div className="preserve">
              <div className="pgrp">
                <div className="ptitle" style={{ color: 'var(--amber)' }}>
                  <span className="d" style={{ background: 'var(--amber)' }} />
                  ASSUMPTIONS
                </div>
                <div id="prAssume" />
              </div>
              <div className="pgrp">
                <div className="ptitle" style={{ color: 'var(--blue)' }}>
                  <span className="d" style={{ background: 'var(--blue)' }} />
                  UNKNOWNS
                </div>
                <div id="prUnknown" />
              </div>
              <div className="pgrp">
                <div className="ptitle" style={{ color: 'var(--violet)' }}>
                  <span className="d" style={{ background: 'var(--violet)' }} />
                  OPEN_QUESTIONS
                </div>
                <div id="prOpen" />
              </div>
            </div>
          </div>
          <div className="ledg-banner">
            <span>
              <b>Deferred ≠ pruned.</b> 되돌릴 수 있으면 보류 + 재방문 트리거. 정보 부족해도 멈추지 않고 구조화 보존한다 — Pruning은 <b>확인된 사실로만</b>.
            </span>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div>
          <div className="fid">Decision OS</div>
          <div className="frole">Canonical DAG harness · 가치 변위 콘솔</div>
        </div>
        <div className="fcontact">
          <span className="fc">
            <span className="d" />
            deterministic engine online
          </span>
        </div>
      </div>

      <div className="toast" id="toast" />
    </div>
  )
}
