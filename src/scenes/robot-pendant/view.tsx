import type { Ref, RefObject } from 'react'
import { SceneHost } from '../_host/SceneHost'
import s from './scene.module.css'

interface DeviceViewProps {
  rootRef: RefObject<HTMLDivElement | null>
  canvasRef: Ref<HTMLCanvasElement>
}

export function DeviceView({ rootRef, canvasRef }: DeviceViewProps) {
  return (
    <SceneHost className={s.root} bg="#0c0d0e">
      <div className="device" ref={rootRef}>
        <div className="contact">
          <b>SPOT_WLD · TEACH PENDANT</b>
        </div>
        <div className="faultflash" data-ref="faultflash" />

        <div className="harnessOv" data-ref="harnessOv">
          <div className="hx-top">
            <div className="hx-tt">
              설비·로봇 티칭 · PLC 시퀀스 제어
              <small>SPOT WELD TEACH · PLC SEQUENCE CONTROL</small>
            </div>
            <div className="hx-env">
              <span className="led c miniLed" />
              MODE: <span data-ref="hx-mode">T1</span> · OVR <span data-ref="hx-ovr">100%</span>
            </div>
            <div className="hx-close">x CLOSE</div>
          </div>
          <div className="hx-body">
            <div className="hx-left">
              <div className="hx-paradox">
                <div className="lbl">핵심 역량 · CORE SKILL</div>
                <div className="big">
                  스팟 용접 포인트를 <b>티치펜던트로 직접 교시</b>하고,
                  <br />
                  취출·단축 로봇 동작을 <b>PLC 시퀀스</b>로 제어한다.
                </div>
              </div>

              <div className="hx-sec-h">
                5대 현장 역량 / 티칭·PLC 시퀀스 <b>waypoint = 설비 역량</b>
              </div>
              <div className="hx-pillars">
                <div className="hx-pillar on" data-pillar="teach">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      스팟 용접 포인트 교시<small>SPOT WELD TEACH</small>
                    </div>
                    <div className="pdesc">티치펜던트로 스팟 용접 건의 포인트별 위치(P1, P2, …)를 직접 교시한다. 이동 경로·자세(W/P/R)·속도·가압 타이밍을 점 단위로 등록한다.</div>
                  </div>
                  <div className="pmap">
                    jog → P[ ] 기록
                    <br />= 용접 포인트 교시
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="plc">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      PLC 시퀀스 제어<small>PLC SEQUENCE</small>
                    </div>
                    <div className="pdesc">단축로봇·취출로봇 동작을 PLC 스텝 시퀀스로 제어한다. 취출로봇 31대 개조·개선, 모터 구동 시퀀스 설정, 인터락 조건 설계.</div>
                  </div>
                  <div className="pmap">
                    STEP / 조건 / 출력
                    <br />= 인터락 시퀀스
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="extract">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      취출 로봇 개조·개선<small>EXTRACTION ROBOT</small>
                    </div>
                    <div className="pdesc">취출(取出)로봇 31대 개조 및 동작 개선. Pin Point GATE 취출 동작 중 커팅 시퀀스를 PLC 인터락과 연동해 사출 불량 없이 안정 취출한다.</div>
                  </div>
                  <div className="pmap">
                    GATE 커팅 / EJECT
                    <br />= 취출 인터락
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="jig">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      엔드밀 사상 JIG 연동<small>JIG INTERLOCK</small>
                    </div>
                    <div className="pdesc">엔드밀 사상 JIG와 로봇 동작을 PLC 인터락으로 연동한다. JIG 클램프 완료 신호 확인 후 로봇 진입, 사상 완료 후 자동 후퇴 시퀀스를 구성한다.</div>
                  </div>
                  <div className="pmap">
                    CLAMP CHK / 진입
                    <br />= JIG 연동 시퀀스
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="weld-seq">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      용접 동작 시퀀스<small>WELD SEQUENCE</small>
                    </div>
                    <div className="pdesc">스팟 용접 동작을 가압→통전→유지→해제 4단계로 분리해 각 단계별 시간·전류 조건을 티칭 프로그램 내 I/O로 제어한다.</div>
                  </div>
                  <div className="pmap">
                    가압→통전→유지
                    <br />= I/O 타이밍 제어
                  </div>
                </div>
              </div>

              <div className="hx-env-bar">
                <div className="hx-env-fill" data-ref="hxEnvFill" />
              </div>
              <div className="hx-env-cap">
                스킬 충족도 <b data-ref="hxEnvPct">100%</b> · 5대 역량 중 <b data-ref="hxEnvN">5</b>개 확인
              </div>

              <div className="hx-cap">
                <b>현장에서 완결하는 기술.</b> 스팟 용접 티칭은 좌표 등록이 아니라 <b>가압→통전→유지 시퀀스 전체를 포인트 단위로 설계</b>하는 과정이다 — 이동 경로·자세·속도·I/O 인터락까지. 취출로봇 31대 개조·PLC 시퀀스 설계 경험이 설비 정지 없는 개선을 가능하게 한다. <b>[확인필요: 좌표 수치는 실제 작업 방식을 기반으로 한 예시값임]</b>
              </div>
            </div>

            <div className="hx-right">
              <div className="hx-sec-h hxSecTight">작업 READOUTS</div>
              <div className="hx-read moat">
                <div className="rt">SPOT WELD TEACH · 스팟 용접 교시</div>
                <div className="rv">
                  티치펜던트로 용접 건의 <b>포인트별 위치를 직접 교시</b>. 이동 경로·자세·속도·가압 타이밍을 P[ ] 단위로 등록.
                </div>
                <div className="rmono">TEACH P[n] → 가압 → 통전 → 유지</div>
                <div className="rv hxInlineNote">좌표 수치는 예시값 [확인필요] — 교시 방법과 시퀀스 구조는 실제 작업 기반.</div>
              </div>
              <div className="hx-read fail">
                <div className="rt">PLC SEQUENCE · 취출 로봇 시퀀스</div>
                <div className="rv">
                  단축로봇·취출로봇 <b>31대 개조·개선</b>. PLC 스텝 시퀀스로 모터 구동·인터락·Pin Point GATE 커팅 제어.
                </div>
                <div className="rv hxInlineNote">
                  → <b className="hot">취출 동작 중 커팅</b> 시퀀스 + 엔드밀 사상 JIG 인터락 연동 직접 설계.
                </div>
              </div>
              <div className="hx-read">
                <div className="rt">MAPPING · 펜던트 → 현장 작업</div>
                <div className="rv hxMonoMap">
                  T1 교시 모드&nbsp;&nbsp;&nbsp;= 포인트 직접 등록
                  <br />
                  jog + 기록&nbsp;&nbsp;&nbsp;&nbsp;= 용접 포인트 위치 확정
                  <br />
                  DO/DI 인터락&nbsp;= 가압·통전·유지 타이밍
                  <br />
                  PLC STEP&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 취출·커팅 시퀀스
                  <br />
                  JIG CLAMP CHK = 로봇 진입 조건 인터락
                </div>
              </div>
              <div className="hx-read hxReadAmber">
                <div className="rt">LIVE · 현재 운전 상태</div>
                <div className="rv hxLive">
                  MODE&nbsp;<b data-ref="hx-mode2">T1</b> · SPD OVR <b data-ref="hx-ovr2">100%</b>
                  <br />
                  FRAME <b data-ref="hx-frame2">WORLD</b> · SERVO <b data-ref="hx-servo2">ON</b>
                </div>
                <div className="rv hxInlineNote">T1(교시) → T2(검증) → AUTO(양산) 단계적 전환으로 안전 확보.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="inner">
          <div className="topbar">
            <div className="brand">
              <div className="logo">TP</div>
              <div className="nm">
                티칭 펜던트 · 스팟 용접 교시
                <small>PROG[SPOT_WLD] · SPOT WELD TEACH</small>
              </div>
            </div>
            <div className="lamps">
              <div className="lamp on" data-ref="l-run">
                <span className="led g" />
                RUNNING
              </div>
              <div className="lamp" data-ref="l-pause">
                <span className="led a" />
                PAUSED
              </div>
              <div className="lamp" data-ref="l-fault">
                <span className="led r" />
                FAULT
              </div>
              <div className="lamp on" data-ref="l-servo">
                <span className="led g" />
                SERVO
              </div>
              <div className="lamp on" data-ref="l-t1">
                <span className="led c" />
                <span data-ref="l-t1-label">T1</span>
              </div>
            </div>
          </div>

          <div className="leftcol">
            <div className="panel">
              <div className="phead">
                SOFT KEYS <b>F-MENU</b>
              </div>
              <div className="softkeys">
                <div className="skey k-sel active" data-soft="SELECT">
                  <span className="ic">SE</span>
                  <span className="lab">
                    SELECT<small>프로그램 선택</small>
                  </span>
                </div>
                <div className="skey k-edit" data-soft="EDIT">
                  <span className="ic">ED</span>
                  <span className="lab">
                    EDIT<small>라인 편집</small>
                  </span>
                </div>
                <div className="skey k-data" data-soft="DATA">
                  <span className="ic">DA</span>
                  <span className="lab">
                    DATA<small>레지스터 R[ ]</small>
                  </span>
                </div>
                <div className="skey k-reset" data-soft="RESET">
                  <span className="ic">RS</span>
                  <span className="lab">
                    RESET<small>알람 해제</small>
                  </span>
                </div>
                <div className="skey k-harness" data-soft="HARNESS">
                  <span className="ic">SK</span>
                  <span className="lab">
                    SKILL<small>스킬 상세</small>
                  </span>
                </div>
              </div>
            </div>
            <div className="panel programInfoPanel">
              <div className="phead">PROGRAM INFO</div>
              <div className="metaP">
                <div className="mrow">
                  <span className="k">PROG</span>
                  <span className="v amb">SPOT_WLD.TP</span>
                </div>
                <div className="mrow">
                  <span className="k">LINES</span>
                  <span className="v" data-ref="mi-lines">— / —</span>
                </div>
                <div className="mrow">
                  <span className="k">CURRENT</span>
                  <span className="v amb" data-ref="mi-cur">P[1]</span>
                </div>
                <div className="mrow">
                  <span className="k">GROUP</span>
                  <span className="v">GP1</span>
                </div>
                <div className="mrow">
                  <span className="k">UFRAME</span>
                  <span className="v">UF:1</span>
                </div>
                <div className="mrow">
                  <span className="k">UTOOL</span>
                  <span className="v">UT:1</span>
                </div>
                <div className="mrow">
                  <span className="k">PAYLOAD</span>
                  <span className="v">용접 건</span>
                </div>
                <div className="mrow">
                  <span className="k">CYCLE</span>
                  <span className="v" data-ref="mi-cyc">000124</span>
                </div>
                <div className="mrow">
                  <span className="k">ROBOT</span>
                  <span className="v">스팟용접 로봇</span>
                </div>
                <div className="mrow">
                  <span className="k">PLC</span>
                  <span className="v">취출로봇 ×31</span>
                </div>
                <div className="mrow skillSetRow">
                  <span className="k">SKILL SET</span>
                  <span className="v" data-ref="mi-skill">TOOL[01..18]</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lcdwrap">
            <div className="lcd">
              <div className="lcd-top">
                <span className="tt">SKILL</span>
                <span>
                  LINE <b data-ref="lt-line">0001</b>
                </span>
                <span data-ref="lcd-mode">JOINT</span>
                <span className="sp">
                  100% <span className="pct" data-ref="lt-ovr">OVR</span>
                </span>
                <span className="ltState" data-ref="lt-state">▶ RUNNING</span>
              </div>
              <div className="lcd-body lcdBodyRel">
                <div className="prog">
                  <div className="prog-scroll" data-ref="progScroll" />
                </div>
                <div className="detail" data-ref="detail" />
                <div className="log-strip" data-ref="logStrip" />
              </div>
              <div className="lcd-status">
                <div className="seg">
                  TOOL <b data-ref="st-tool">UT:1 [WELD-GUN]</b>
                </div>
                <div className="seg amb">
                  SPD <b data-ref="st-spd">100%</b>
                </div>
                <div className="seg">
                  MOTN <b data-ref="st-motn">FINE</b>
                </div>
                <div className="seg grow" data-ref="st-msg">SPOT WELD TEACH · P[4] 포인트 교시 완료</div>
              </div>
            </div>
          </div>

          <div className="rightcol">
            <div className="panel viewportPanel">
              <div className="viewport">
                <canvas ref={canvasRef} className={s.c} />
                <div className="vp-ov">
                  <span className="tl" data-ref="vp-tl">VIEW · WORLD FRAME</span>
                  <span className="tr" data-ref="vp-pt">▸ AT P[1]</span>
                  <span className="bl" data-ref="vp-st">스팟용접 로봇 · SERVO ON</span>
                </div>
              </div>
            </div>

            <div className="panel dro">
              <div className="phead droHead">
                TCP POSITION <b data-ref="dro-frame">WORLD</b>
              </div>
              <div className="dro-grid">
                <div className="dro-cell x">
                  <div className="ax">X</div>
                  <div className="val" data-ref="d-x">0.0</div>
                  <div className="un">mm</div>
                </div>
                <div className="dro-cell y">
                  <div className="ax">Y</div>
                  <div className="val" data-ref="d-y">0.0</div>
                  <div className="un">mm</div>
                </div>
                <div className="dro-cell z">
                  <div className="ax">Z</div>
                  <div className="val" data-ref="d-z">0.0</div>
                  <div className="un">mm</div>
                </div>
                <div className="dro-cell">
                  <div className="ax">W</div>
                  <div className="val" data-ref="d-w">0.0</div>
                  <div className="un">deg</div>
                </div>
                <div className="dro-cell">
                  <div className="ax">P</div>
                  <div className="val" data-ref="d-p">0.0</div>
                  <div className="un">deg</div>
                </div>
                <div className="dro-cell">
                  <div className="ax">R</div>
                  <div className="val" data-ref="d-r">0.0</div>
                  <div className="un">deg</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="phead">
                JOG · 수동 조작 <b data-ref="jog-frame">WORLD</b>
              </div>
              <div className="jog">
                <div className="dpad">
                  <div className="jbtn up" data-jog="Y+">+Y</div>
                  <div className="jbtn dn" data-jog="Y-">−Y</div>
                  <div className="jbtn lf" data-jog="X-">−X</div>
                  <div className="jbtn rt" data-jog="X+">+X</div>
                  <div className="jbtn zp" data-jog="Z+">+Z</div>
                  <div className="jbtn zm" data-jog="Z-">−Z</div>
                  <div className="ctr">
                    JOG
                    <br />
                    1.0mm
                  </div>
                </div>
                <div className="jogside">
                  <div className="coordsel">
                    <div className="csel on" data-coord="WORLD">WORLD</div>
                    <div className="csel" data-coord="TOOL">TOOL</div>
                    <div className="csel" data-coord="JOINT">JOINT</div>
                  </div>
                  <div className="ovr">
                    <div className="ovr-top">
                      <span>SPEED OVR</span>
                      <b data-ref="ovr-val">100%</b>
                    </div>
                    <div className="ovr-bar" data-ref="ovrBar">
                      <div className="ovr-fill" data-ref="ovrFill" />
                    </div>
                    <div className="ovr-ticks">
                      <span>VFINE</span>
                      <span>25</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bottombar">
            <div className="fkeys">
              <div className="fk rew" data-act="rew">
                <span className="ico">⏮</span>
                <span className="ttl">REWIND</span>
                <span className="sub">BWD</span>
              </div>
              <div className="fk play active" data-act="play">
                <span className="ico">▶</span>
                <span className="ttl">PLAY</span>
                <span className="sub">CYCLE START</span>
              </div>
              <div className="fk pause" data-act="pause">
                <span className="ico">⏸</span>
                <span className="ttl">HOLD</span>
                <span className="sub">FEED HOLD</span>
              </div>
              <div className="fk step" data-act="step">
                <span className="ico">⏭</span>
                <span className="ttl">STEP</span>
                <span className="sub">FWD 1 LINE</span>
              </div>
            </div>
            <div className="cluster">
              <div className="modesw">
                <div className="ml">MODE SELECT KEY-SW</div>
                <div className="modes">
                  <div className="mode on" data-mode="T1">
                    T1<small>≤250mm/s</small>
                  </div>
                  <div className="mode" data-mode="T2">
                    T2<small>TEST FULL</small>
                  </div>
                  <div className="mode" data-mode="AUTO">
                    AUTO<small>운전</small>
                  </div>
                </div>
                <div className="servo on" data-ref="servoSw">
                  <div className="sw">
                    <div className="kn" />
                  </div>
                  <span className="slab" data-ref="servo-label">SERVO ON</span>
                </div>
              </div>
              <div className="estop" data-ref="estop">
                <div className="btn">
                  EMERGENCY
                  <br />
                  STOP
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="minitag">티칭펜던트 · SPOT_WLD.TP · 취출로봇 PLC SEQ · v2025.08</div>
        <div className="toast" data-ref="toast" />
      </div>
    </SceneHost>
  )
}
