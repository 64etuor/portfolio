'use client'

import type React from 'react'
import { SceneHost } from '../_host/SceneHost'
import type { PanelState, PidRuntimeRefs } from './types'
import s from './scene.module.css'

export interface PidSchemeViewProps extends PidRuntimeRefs {
  panel: PanelState
  closePanel: () => void
  handleClick: (e: React.MouseEvent<SVGElement | HTMLElement>) => void
}

export function PidSchemeView({
  panel,
  closePanel,
  handleClick,
  smStateRef,
  smBackoffRef,
  smBarRef,
  applyFillRef,
  tickerDotRef,
  tickerHzRef,
  ilBoxRef,
  ilGaugeRef,
  ilPctRef,
  ilStatusRef,
  deployRORef
}: PidSchemeViewProps) {
  return (
    <SceneHost bg="#070910">
      <div className={s.wrap}>
        <div className={s.stage}>
          <div className={s.borderOuter} />
          <div className={s.borderInner} />
          <div className={`${s.corner} ${s.cornerTl}`} />
          <div className={`${s.corner} ${s.cornerTr}`} />
          <div className={`${s.corner} ${s.cornerBl}`} />
          <div className={`${s.corner} ${s.cornerBr}`} />
          <div className={`${s.ruler} ${s.rulerTop}`}>
            <span>1</span><span>2</span><span>3</span><span>4</span>
            <span>5</span><span>6</span><span>7</span><span>8</span>
          </div>
          <div className={`${s.ruler} ${s.rulerLeft}`}>
            <span>A</span><span>B</span><span>C</span><span>D</span>
          </div>

          <div className={s.content}>
            <header className={s.titlebar}>
              <div className={s.titleMain}>
                <h1>P&amp;ID 시스템 토폴로지 — 소프트웨어 아키텍처 도면</h1>
                <div className="sub">PIPING &amp; INSTRUMENTATION DIAGRAM · ISA-5.1 · SYSTEM TOPOLOGY</div>
              </div>
              <div className={s.titleMeta}>
                <div>DWG NO. <b>SYS-001</b> · REV. <b>D</b> · SHEET <b>1 of 1</b></div>
              </div>
            </header>

            {/* ── readouts ── */}
            <div className={s.readouts}>
              <div className={s.ro}><div className="lab">START STATE</div><div className="val">단일 EC2</div></div>
              <div className={s.ro}><div className="lab">RUNTIME</div><div className="val good">ECS SVC</div></div>
              <div className={s.ro}><div className="lab">TRAFFIC GATE</div><div className="val good">ALB TG</div></div>
              <div className={s.ro}><div className="lab">INFRA AS CODE</div><div className="val good">Terraform</div></div>
              <div className={s.ro}><div className="lab">OBSERVABILITY</div><div className="val good">CW + Sentry</div></div>
              <div className={s.ro}><div className="lab">RECOVERY</div><div className="val">Alarm→Runbook</div></div>
              <div className={s.ro}>
                <div className="lab">DEPLOY GATE</div>
                <div
                  className="val"
                  ref={deployRORef}
                  style={{ color: 'var(--trip)' }}
                >BLOCKED</div>
              </div>
            </div>

            {/* ── MAIN SCHEME SVG ── */}
            <svg
              id="scheme"
              className={s.scheme}
              viewBox="0 0 1540 940"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="System Topology P&amp;ID"
            >
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L7,3 L0,6 Z" fill="var(--line)" />
                </marker>
                <marker id="arrowFlow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--flow)" />
                </marker>
              </defs>

              {/* ── TRAIN BANDS ── */}
              <rect className="train-band" x="14" y="30" width="1512" height="270" />
              <rect className="train-band" x="14" y="320" width="1512" height="270" />
              <rect className="train-band" x="14" y="610" width="1512" height="300" />
              <text className="train-label" x="26" y="52">TRAIN A · RUNTIME CUTOVER — 단일 EC2 → ECS Service + ALB Target Group 이중화</text>
              <text className="train-sub" x="26" y="66">수동 복구가 필요했던 단일 EC2 운영면을 ALB health check · ECS desired count · rolling deploy 흐름으로 전환</text>
              <text className="train-label" x="26" y="342">TRAIN B · TERRAFORM IAC MODULE — 인프라 코드화 / 배포 표준화</text>
              <text className="train-sub" x="26" y="356">Terraform plan → state lock → apply → AWS resource convergence · ALB/ECS/CloudWatch 모듈 기준선</text>
              <text className="train-label" x="26" y="632">TRAIN C · OBSERVABILITY FILL-IN — CloudWatch · Sentry 관측 표면</text>
              <text className="train-sub" x="26" y="646">비어 있던 관제 자리(에러 추적 없음 · 비용 가시성 없음 · 수동 복구)를 메트릭 · 로그 · 트레이스 · 알람으로 채움</text>

              {/* ── TRAIN A ── */}
              <g className="clickable" data-id="client" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="40" y="120" width="120" height="150" fill="transparent" />
                <rect className="sym-fill" x="55" y="135" width="90" height="120" rx="4" />
                <path d="M55,160 a45,12 0 0 0 90,0" fill="none" className="sym" />
                <line x1="55" y1="160" x2="55" y2="135" className="sym" /><line x1="145" y1="160" x2="145" y2="135" className="sym" />
                <path d="M55,135 a45,12 0 0 1 90,0" fill="none" className="sym" />
                <text className="tag" x="100" y="200">단일 EC2</text>
                <text className="tagnum" x="100" y="215">START-A01</text>
                <text className="lbl-sm" x="100" y="240" textAnchor="middle">수동 복구 운영면</text>
              </g>

              <g className="clickable" data-id="gateway" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="235" y="120" width="130" height="150" fill="transparent" />
                <rect className="sym-fill" x="250" y="150" width="100" height="80" rx="3" />
                <line x1="250" y1="172" x2="350" y2="172" className="sym" />
                <path d="M260,210 q15,-26 30,0 q15,26 30,0 q15,-26 30,0" fill="none" stroke="var(--accent2)" strokeWidth="2" />
                <text className="tag" x="300" y="167">ALB LISTENER</text>
                <text className="tagnum" x="300" y="248">HTTPS 443 · LSN-A02</text>
              </g>

              <g className="clickable" data-id="targetgroup" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="430" y="120" width="120" height="150" fill="transparent" />
                <rect className="sym-fill" x="445" y="150" width="90" height="80" rx="3" />
                <line x1="445" y1="150" x2="535" y2="230" className="sym" strokeWidth="1.2" />
                <line x1="445" y1="230" x2="535" y2="150" className="sym" strokeWidth="1.2" />
                <text className="tag" x="490" y="145">TARGET GROUP</text>
                <text className="tagnum" x="490" y="248">health check · TG-A03</text>
              </g>

              <g className="clickable" data-id="service" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="615" y="120" width="130" height="150" fill="transparent" />
                <circle className="sym" cx="680" cy="190" r="42" />
                <path d="M680,190 L712,172 L712,208 Z" fill="var(--accent2)" stroke="none" />
                <circle cx="680" cy="190" r="6" fill="var(--txt)" />
                <text className="tag" x="680" y="252">ECS SERVICE</text>
                <text className="lbl-sm" x="680" y="146" textAnchor="middle">desired count 2</text>
              </g>

              <g className="clickable" data-id="db" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="815" y="105" width="150" height="180" fill="transparent" />
                <path d="M835,150 a55,16 0 0 1 110,0 L945,250 a55,16 0 0 1 -110,0 Z" className="sym-fill" />
                <path d="M835,150 a55,16 0 0 0 110,0" className="sym" fill="none" />
                <path d="M835,185 a55,16 0 0 0 110,0" className="pipe-soft" />
                <path d="M835,218 a55,16 0 0 0 110,0" className="pipe-soft" />
                <text className="tag" x="890" y="145">RDS / Store</text>
                <text className="tagnum" x="890" y="270">VESSEL TK-A05</text>
              </g>

              <g className="clickable" data-id="response" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="1035" y="120" width="160" height="150" fill="transparent" />
                <rect className="sym-fill" x="1055" y="145" width="120" height="90" rx="2" />
                <path d="M1145,145 l0,18 l18,0" fill="none" className="sym" /><path d="M1145,145 l18,18" className="sym" />
                <line x1="1070" y1="180" x2="1150" y2="180" className="sym" strokeWidth="1.2" />
                <line x1="1070" y1="198" x2="1150" y2="198" className="sym" strokeWidth="1.2" />
                <line x1="1070" y1="216" x2="1130" y2="216" className="sym" strokeWidth="1.2" />
                <text className="tag" x="1115" y="252">ROLLING DEPLOY</text>
                <text className="tagnum" x="1115" y="138" textAnchor="middle">ECS scheduler · DEP-A06</text>
              </g>

              {/* Train A piping */}
              <path className="pipe" d="M145,195 H250" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M145,195 H248" />
              <path className="pipe" d="M350,190 H445" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M350,190 H443" />
              <path className="pipe" d="M535,190 H638" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M535,190 H636" />
              <path className="pipe" d="M722,190 H833" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M722,190 H831" />
              <path className="pipe" d="M945,200 H1053" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M945,200 H1051" />

              {/* Health valve */}
              <g className="clickable" data-id="ratelimit" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="760" y="160" width="40" height="60" fill="transparent" />
                <path d="M770,178 L790,202 L770,202 L790,178 Z" className="sym" fill="var(--panel)" />
                <line x1="780" y1="190" x2="780" y2="172" className="sym" strokeWidth="1.6" />
                <rect x="772" y="166" width="16" height="6" className="sym-fill" />
                <text className="tagnum" x="780" y="226">HC-A1</text>
              </g>

              {/* Train A instruments */}
              <g className="clickable instr" data-id="ft-a101" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="197" y1="195" x2="197" y2="120" className="sig-flow" />
                <circle className="bubble" cx="197" cy="105" r="20" />
                <text className="tag" x="197" y="101">FT</text><text className="tagnum" x="197" y="114">A101</text>
              </g>
              <g className="clickable instr" data-id="ai-a102" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="490" y1="150" x2="490" y2="95" className="pipe-soft" />
                <circle className="bubble" cx="490" cy="80" r="20" />
                <line x1="470" y1="80" x2="510" y2="80" className="sym" strokeWidth="1.4" />
                <text className="tag" x="490" y="76">HC</text><text className="tagnum" x="490" y="92">A102</text>
              </g>
              <g className="clickable instr" data-id="qic-a103" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="680" y1="148" x2="680" y2="92" className="pipe-soft" />
                <circle className="bubble" cx="680" cy="78" r="20" />
                <line x1="660" y1="78" x2="700" y2="78" className="sym" strokeWidth="1.4" />
                <text className="tag" x="680" y="74">SIC</text><text className="tagnum" x="680" y="90">A103</text>
              </g>
              <g className="clickable instr" data-id="lic-a104" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="890" y1="150" x2="890" y2="92" className="pipe-elec" />
                <circle className="bubble" cx="890" cy="78" r="20" />
                <text className="tag" x="890" y="74">LIC</text><text className="tagnum" x="890" y="90">A104</text>
              </g>
              <g className="clickable instr" data-id="qv-a105" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="1115" y1="145" x2="1115" y2="110" className="pipe-soft" />
                <circle className="bubble" cx="1115" cy="95" r="20" />
                <line x1="1095" y1="95" x2="1135" y2="95" className="sym" strokeWidth="1.4" />
                <text className="tag" x="1115" y="91">DG</text><text className="tagnum" x="1115" y="104">A105</text>
              </g>

              {/* ── TRAIN B ── */}
              <g className="clickable" data-id="producer" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="40" y="400" width="120" height="170" fill="transparent" />
                <rect className="sym-fill" x="55" y="415" width="70" height="34" rx="2" />
                <rect className="sym-fill" x="55" y="455" width="70" height="34" rx="2" />
                <rect className="sym-fill" x="55" y="495" width="70" height="34" rx="2" />
                <text className="tagnum" x="90" y="437" textAnchor="middle">alb.tf</text>
                <text className="tagnum" x="90" y="477" textAnchor="middle">ecs.tf</text>
                <text className="tagnum" x="90" y="517" textAnchor="middle">observability.tf</text>
                <text className="tag" x="90" y="552">TF MODULES</text>
              </g>

              <g className="clickable" data-id="tfplan" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="225" y="400" width="150" height="170" fill="transparent" />
                <rect className="sym-fill" x="245" y="430" width="110" height="100" rx="6" />
                <circle cx="300" cy="480" r="30" fill="none" className="sym" strokeDasharray="4 3" />
                <path d="M282,466 H318 M282,480 H318 M282,494 H308" fill="none" stroke="var(--amber)" strokeWidth="2.4" />
                <text className="tag" x="300" y="552">TERRAFORM PLAN</text>
                <text className="tagnum" x="300" y="424" textAnchor="middle">diff 검토 / blast radius</text>
              </g>

              <g className="clickable" data-id="idempkey" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="430" y="400" width="120" height="170" fill="transparent" />
                <circle className="sym" cx="490" cy="480" r="40" />
                <path d="M490,480 L520,464 L520,496 Z" fill="var(--accent3)" stroke="none" />
                <circle cx="490" cy="480" r="5" fill="var(--txt)" />
                <text className="tag" x="490" y="552">STATE LOCK P-B14</text>
                <text className="tagnum" x="490" y="424" textAnchor="middle">remote state · lock</text>
              </g>

              {/* Terraform apply control loop */}
              <g id="applyLoop">
                <rect className="ctrl-loop-box" x="615" y="395" width="330" height="185" rx="6" />
                <text className="train-sub" x="625" y="412" fill="var(--amber)" style={{ fontWeight: 800 }}>TERRAFORM APPLY 제어루프 · SP=SERVICE STABLE</text>

                <g className="clickable" data-id="tfapply" onClick={handleClick} style={{ cursor: 'pointer' }}>
                  <rect className="hit" x="630" y="430" width="120" height="120" fill="transparent" />
                  <rect className="sym-fill" x="645" y="450" width="90" height="86" rx="3" />
                  <rect
                    ref={applyFillRef}
                    x="647" y="498" width="86" height="36"
                    fill="rgba(54,217,217,.18)"
                  />
                  <line x1="645" y1="470" x2="735" y2="470" stroke="var(--amber)" strokeWidth="1.6" strokeDasharray="4 3" />
                  <text className="tag" x="690" y="446">APPLY TK-B15</text>
                  <text className="tagnum" x="690" y="552">plan/apply output</text>
                </g>

                <g>
                  <rect className="sym-fill" x="775" y="445" width="155" height="100" rx="3" />
                  <text className="tagnum" x="852" y="438" textAnchor="middle">APPLY STATE SIC-B16</text>
                  <text
                    ref={smStateRef}
                    x="852" y="478" textAnchor="middle"
                    style={{ fontSize: '14px', fontWeight: 800, fill: 'var(--amber)' }}
                  >PLAN</text>
                  <text ref={smBackoffRef} x="852" y="500" textAnchor="middle" className="tagnum">stage: validate</text>
                  <text
                    ref={smBarRef}
                    x="852" y="525" textAnchor="middle" className="tagnum"
                    style={{ letterSpacing: '2px' }}
                  >○○○○</text>
                </g>
                <g className="clickable instr" data-id="lic-b16" onClick={handleClick} style={{ cursor: 'pointer' }}>
                  <circle className="bubble" cx="690" cy="408" r="0" opacity="0" />
                </g>
              </g>

              <g className="clickable" data-id="dbcommit" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="1015" y="395" width="150" height="180" fill="transparent" />
                <path d="M1035,440 a52,15 0 0 1 104,0 L1139,535 a52,15 0 0 1 -104,0 Z" className="sym-fill" />
                <path d="M1035,440 a52,15 0 0 0 104,0" className="sym" fill="none" />
                <path d="M1035,472 a52,15 0 0 0 104,0" className="pipe-soft" />
                <path d="M1035,503 a52,15 0 0 0 104,0" className="pipe-soft" />
                <text className="tag" x="1087" y="435">AWS STATE</text>
                <text className="tagnum" x="1087" y="560">ALB/ECS/CW · TK-B17</text>
              </g>

              <g className="clickable instr" data-id="cw-b18" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="1087" y1="395" x2="1087" y2="360" className="pipe-elec" />
                <circle className="bubble" cx="1087" cy="345" r="20" />
                <text className="tag" x="1087" y="341">CW</text><text className="tagnum" x="1087" y="354">B18</text>
              </g>

              <g className="clickable" data-id="dlq" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="1230" y="420" width="130" height="120" fill="transparent" />
                <rect className="sym-fill" x="1245" y="440" width="100" height="80" rx="3" strokeDasharray="5 3" />
                <text className="tagnum" x="1295" y="462" textAnchor="middle">Drift</text>
                <text className="tagnum" x="1295" y="478" textAnchor="middle">Review</text>
                <text className="tagnum" x="1295" y="493" textAnchor="middle">수동 변경 격리</text>
                <text className="tagnum" x="1295" y="508" textAnchor="middle">plan 재검토</text>
                <text className="tag" x="1295" y="538">DRIFT-B19</text>
              </g>

              {/* Train B piping */}
              <path className="pipe" d="M125,480 H242" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M125,480 H240" />
              <path className="pipe" d="M355,480 H448" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M355,480 H446" />
              <path className="pipe" d="M530,480 H643" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M530,480 H641" />
              <path className="pipe" d="M735,490 H775" />
              <path className="pipe" d="M930,490 H1033" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M930,490 H1031" />
              <path className="pipe-elec" d="M1139,490 H1238" />

              {/* Train B instruments */}
              <g className="clickable instr" data-id="ti-b11" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="90" y1="415" x2="90" y2="378" className="sig-flow" />
                <circle className="bubble" cx="90" cy="363" r="20" />
                <text className="tag" x="90" y="359">VC</text><text className="tagnum" x="90" y="372">B11</text>
              </g>
              <g className="clickable instr" data-id="pi-b12" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="300" y1="430" x2="300" y2="378" className="pipe-elec" />
                <circle className="bubble" cx="300" cy="363" r="20" />
                <text className="tag" x="300" y="359">PD</text><text className="tagnum" x="300" y="372">B12</text>
              </g>
              <g className="clickable instr" data-id="qt-b13" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="490" y1="440" x2="490" y2="378" className="pipe-soft" />
                <circle className="bubble" cx="490" cy="363" r="20" />
                <line x1="470" y1="363" x2="510" y2="363" className="sym" strokeWidth="1.4" />
                <text className="tag" x="490" y="359">SL</text><text className="tagnum" x="490" y="372">B13</text>
              </g>

              {/* ── TRAIN C ── */}
              <g className="clickable" data-id="obsources" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="40" y="700" width="140" height="170" fill="transparent" />
                <rect className="ghost-box" x="55" y="715" width="115" height="30" rx="2" />
                <rect className="ghost-box" x="55" y="755" width="115" height="30" rx="2" />
                <rect className="ghost-box" x="55" y="795" width="115" height="30" rx="2" />
                <text className="ghost-text" x="112" y="734">에러 추적 없음</text>
                <text className="ghost-text" x="112" y="774">비용 가시성 없음</text>
                <text className="ghost-text" x="112" y="814">수동 복구</text>
                <text className="tag" x="112" y="858">EMPTY TOOL SEATS</text>
              </g>

              <g className="clickable" data-id="aggregator" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="270" y="700" width="170" height="170" fill="transparent" />
                <rect className="sym-fill" x="290" y="730" width="130" height="110" rx="8" />
                <path d="M310,785 l20,-28 l20,28 l20,-28 l20,28" fill="none" stroke="var(--accent3)" strokeWidth="2.4" />
                <circle cx="355" cy="810" r="6" fill="var(--txt)" />
                <text className="tag" x="355" y="862">CLOUDWATCH R-C21</text>
                <text className="tagnum" x="355" y="724" textAnchor="middle">metrics · logs · alarms</text>
              </g>

              <g className="clickable" data-id="tsdb" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="510" y="700" width="150" height="180" fill="transparent" />
                <path d="M530,745 a52,15 0 0 1 104,0 L634,840 a52,15 0 0 1 -104,0 Z" className="sym-fill" />
                <path d="M530,745 a52,15 0 0 0 104,0" className="sym" fill="none" />
                <path d="M530,777 a52,15 0 0 0 104,0" className="pipe-soft" />
                <path d="M530,808 a52,15 0 0 0 104,0" className="pipe-soft" />
                <text className="tag" x="582" y="740">CW LOG GROUP</text>
                <text className="tagnum" x="582" y="865">TK-C22 · retention/cost</text>
              </g>

              <g className="clickable" data-id="dashboard" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="720" y="700" width="150" height="170" fill="transparent" />
                <rect className="sym-fill" x="740" y="740" width="110" height="90" rx="3" />
                <ellipse cx="795" cy="785" rx="48" ry="18" fill="none" className="sym" strokeWidth="1.6" />
                <ellipse cx="795" cy="785" rx="48" ry="18" fill="none" className="sym" strokeWidth="1.6" transform="rotate(60 795 785)" />
                <ellipse cx="795" cy="785" rx="48" ry="18" fill="none" className="sym" strokeWidth="1.6" transform="rotate(120 795 785)" />
                <circle cx="795" cy="785" r="6" fill="var(--accent2)" />
                <text className="tag" x="795" y="852">SENTRY</text>
              </g>

              <g className="clickable" data-id="humangate" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <rect className="hit" x="940" y="690" width="430" height="190" fill="transparent" />
                <rect className="ctrl-loop-box" x="950" y="700" width="410" height="170" rx="6" stroke="var(--accent3)" />
                <text className="train-sub" x="962" y="718" fill="var(--accent3)" style={{ fontWeight: 800 }}>ALARM + RUNBOOK · 수동 복구를 절차화</text>
                <g id="gateNodes">
                  <rect className="filled-box" x="962" y="735" width="64" height="36" rx="2" /><text className="tagnum" x="994" y="757" textAnchor="middle">alarm</text>
                  <rect className="filled-box" x="1040" y="735" width="64" height="36" rx="2" /><text className="tagnum" x="1072" y="757" textAnchor="middle">triage</text>
                  <rect className="filled-box" x="1118" y="735" width="64" height="36" rx="2" /><text className="tagnum" x="1150" y="757" textAnchor="middle">runbook</text>
                  <rect className="filled-box" x="1196" y="735" width="74" height="36" rx="2" /><text className="tagnum" x="1233" y="757" textAnchor="middle">rollback</text>
                  <rect className="filled-box" x="1284" y="735" width="68" height="36" rx="2" /><text className="tagnum" x="1318" y="757" textAnchor="middle">verify</text>
                  <line x1="1026" y1="753" x2="1040" y2="753" className="pipe-soft" />
                  <line x1="1104" y1="753" x2="1118" y2="753" className="pipe-soft" />
                  <line x1="1182" y1="753" x2="1196" y2="753" className="pipe-soft" />
                  <line x1="1270" y1="753" x2="1284" y2="753" className="pipe-soft" />
                </g>
                <circle id="pid-ticker-dot" ref={tickerDotRef} cx="975" cy="825" r="7" fill="var(--accent3)" />
                <text className="tagnum" x="1000" y="830" textAnchor="start">CloudWatch alarm heartbeat</text>
                <text
                  id="pid-ticker-hz"
                  ref={tickerHzRef}
                  className="tagnum"
                  x="1206" y="830" textAnchor="start"
                  fill="var(--accent3)"
                >configured</text>
              </g>

              {/* Train C piping */}
              <path className="pipe" d="M170,785 H288" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M170,785 H286" />
              <path className="pipe" d="M420,785 H528" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M420,785 H526" />
              <path className="pipe" d="M634,790 H738" markerEnd="url(#arrow)" />
              <path className="pipe-flow" d="M634,790 H736" />
              <path className="pipe-soft" d="M870,785 H948" markerEnd="url(#arrow)" />

              {/* Train C instruments */}
              <g className="clickable instr" data-id="fc-c21" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="355" y1="730" x2="355" y2="695" className="pipe-soft" />
                <circle className="bubble" cx="355" cy="680" r="20" />
                <line x1="335" y1="680" x2="375" y2="680" className="sym" strokeWidth="1.4" />
                <text className="tag" x="355" y="676">FC</text><text className="tagnum" x="355" y="690">C21</text>
              </g>
              <g className="clickable instr" data-id="li-c22" onClick={handleClick} style={{ cursor: 'pointer' }}>
                <line x1="582" y1="745" x2="582" y2="695" className="pipe-elec" />
                <circle className="bubble" cx="582" cy="680" r="20" />
                <text className="tag" x="582" y="676">LI</text><text className="tagnum" x="582" y="690">C22</text>
              </g>

              {/* ── INTERLOCK BADGE ── */}
              <g id="pid-interlock-badge" style={{ cursor: 'pointer' }}>
                <rect
                  ref={ilBoxRef}
                  id="ilBox"
                  className="sym-fill"
                  x="1230" y="120" width="270" height="150" rx="4"
                  stroke="var(--trip)"
                  strokeWidth="2.4"
                />
                <text className="tag" x="1365" y="146" style={{ fontSize: '12px', fill: 'var(--trip)' }}>DEPLOY HEALTH INTERLOCK</text>
                <text className="tagnum" x="1365" y="162">ISL-901 · ALB target health gate</text>
                <circle id="ilGaugeBg" cx="1300" cy="210" r="40" fill="none" stroke="var(--grid)" strokeWidth="8" />
                <circle
                  ref={ilGaugeRef}
                  id="ilGauge"
                  cx="1300" cy="210" r="40"
                  fill="none"
                  stroke="var(--trip)"
                  strokeWidth="8"
                  strokeDasharray="251"
                  strokeDashoffset="213"
                  transform="rotate(-90 1300 210)"
                  strokeLinecap="round"
                />
                <text
                  ref={ilPctRef}
                  id="ilPct"
                  x="1300" y="207"
                  textAnchor="middle"
                  style={{ fontSize: '18px', fontWeight: 800, fill: 'var(--trip)' }}
                >BLOCK</text>
                <text className="tagnum" x="1300" y="223" textAnchor="middle">healthy target 비율</text>
                <text
                  ref={ilStatusRef}
                  id="ilStatus"
                  x="1430" y="205"
                  textAnchor="middle"
                  style={{ fontSize: '13px', fontWeight: 800, fill: 'var(--trip)' }}
                >WAITING</text>
                <text className="tagnum" x="1430" y="225" textAnchor="middle">클릭=검증</text>
                <text className="lbl-sm" x="1365" y="258" textAnchor="middle">ALB health check 통과 후 ECS rolling deploy 허용</text>
              </g>
            </svg>

            {/* ── tool sequence ── */}
            <div className={s.toolSequence} aria-label="비어 있던 관제 도구가 CloudWatch와 Sentry로 채워지는 순서">
              <div className={s.toolCol}>
                <div className={s.toolHead}>Before · 없는 도구의 음영</div>
                <div className={s.toolRow}><div className={s.toolGhost}>에러 추적 없음</div><div className={s.toolArrow}>→</div><div className={s.toolFill}>Sentry issue + trace</div></div>
                <div className={s.toolRow}><div className={s.toolGhost}>비용 가시성 없음</div><div className={s.toolArrow}>→</div><div className={s.toolFill}>CloudWatch metrics/log retention</div></div>
                <div className={s.toolRow}><div className={s.toolGhost}>수동 복구</div><div className={s.toolArrow}>→</div><div className={s.toolFill}>Alarm + runbook + rollback check</div></div>
              </div>
              <div className={s.toolCol}>
                <div className={s.toolHead}>Built · 인프라·관제</div>
                <div className={s.toolRow}><div className={s.toolGhost}>단일 EC2</div><div className={s.toolArrow}>→</div><div className={s.toolFill}>ECS Service + ALB Target Group</div></div>
                <div className={s.toolRow}><div className={s.toolGhost}>콘솔 수동 변경</div><div className={s.toolArrow}>→</div><div className={s.toolFill}>Terraform IaC module</div></div>
                <div className={s.toolRow}><div className={s.toolGhost}>배포 중 다운타임</div><div className={s.toolArrow}>→</div><div className={s.toolFill}>ECS rolling deploy health gate</div></div>
              </div>
            </div>

            {/* ── footer ── */}
            <div className={s.footgrid}>
              <div className={s.legend}>
                <h3>RANGE · LEGEND (ISA-5.1)</h3>
                <div className={s.legrow}>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><line x1="0" y1="7" x2="38" y2="7" stroke="var(--line)" strokeWidth="3" /></svg> 프로세스 데이터 흐름</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><line x1="0" y1="7" x2="38" y2="7" stroke="var(--accent2)" strokeWidth="1.6" strokeDasharray="7 5" /></svg> 신호/계측 링크</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><line x1="0" y1="7" x2="38" y2="7" stroke="var(--accent3)" strokeWidth="1.6" strokeDasharray="2 4" /></svg> 소프트웨어 링크</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><circle cx="19" cy="7" r="6" fill="none" stroke="var(--line)" strokeWidth="2" /></svg> 현장 계측기(field)</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><circle cx="19" cy="7" r="6" fill="none" stroke="var(--line)" strokeWidth="2" /><line x1="13" y1="7" x2="25" y2="7" stroke="var(--line)" /></svg> 패널/SW 계측기</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><circle cx="19" cy="7" r="6" fill="none" stroke="var(--line)" strokeWidth="2" /><path d="M22,4 L26,7 L22,10Z" fill="var(--line)" /></svg> ECS 서비스/프로세서</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><path d="M11,3 L25,11 L11,11 L25,3 Z" fill="none" stroke="var(--line)" strokeWidth="1.6" /></svg> 헬스체크/배포 게이트</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><rect x="11" y="2" width="16" height="10" rx="2" fill="none" stroke="var(--line)" strokeWidth="1.6" /></svg> 데이터스토어/베셀</div>
                  <div className={s.legitem}><svg viewBox="0 0 38 14"><rect x="8" y="2" width="22" height="10" rx="2" fill="none" stroke="var(--txt-faint)" strokeWidth="1.6" strokeDasharray="4 3" /></svg> 없는 도구의 음영</div>
                </div>
              </div>
              <div className={s.titleblock}>
                <h3>TITLE BLOCK</h3>
                <div className={s.tbGrid}>
                  <div className={s.tbCell}><div className="k">도면명 / TITLE</div><div className="v">ECS/Terraform 관제 토폴로지</div></div>
                  <div className={s.tbCell}><div className="k">DWG NO.</div><div className="v">SYS-001</div></div>
                  <div className={s.tbCell}><div className="k">REV.</div><div className="v">D</div></div>
                  <div className={s.tbCell}><div className="k">날짜 / DATE</div><div className="v">2026-06-15</div></div>
                  <div className={s.tbCell}><div className="k">설계 / DESIGNED</div><div className="v">SYS ARCH</div></div>
                  <div className={s.tbCell}><div className="k">SCALE</div><div className="v">N.T.S.</div></div>
                </div>
              </div>
            </div>
            <p className={s.hint}>&#9655; 계측기(bubble) · 서비스 · 베셀을 클릭하면 인프라 상세가 열립니다. · DEPLOY HEALTH INTERLOCK을 클릭하면 ALB 헬스체크 → ECS rolling deploy 허용 시퀀스가 작동합니다.</p>
          </div>
        </div>

        {/* ── DETAIL PANEL ── */}
        <div className={`${s.panel}${panel.open ? ' ' + s.open : ''}`} role="dialog" aria-modal="true">
          <button className={s.pclose} onClick={closePanel} aria-label="close">&#10005;</button>
          <div className={s.panelHead}>
            <div className="ptag">{panel.tag}</div>
            <h2>{panel.title}</h2>
            <div className="ptype">{panel.type}</div>
          </div>
          <div
            className={s.panelBody}
            dangerouslySetInnerHTML={{ __html: panel.body }}
          />
        </div>
      </div>

      {/* SVG global styles — inline so they're scoped to this scene's DOM */}
      <style>{`
        #scheme .train-band{fill:rgba(74,168,255,0.025);stroke:#1a2030;stroke-width:1;stroke-dasharray:4 3;}
        #scheme .train-label{font-size:13px;font-weight:800;fill:#4aa8ff;letter-spacing:0.02em;font-family:'JetBrains Mono', 'Pretendard Variable', monospace;}
        #scheme .train-sub{font-size:9.5px;fill:#5a6a82;font-family:'DM Mono', 'Pretendard Variable', monospace;}
        #scheme text{font-family:'DM Mono', 'Pretendard Variable', monospace;}
        /* DM Mono 는 400/500 만 로드 — 굵은 SVG 텍스트는 JetBrains Mono(동일 0.6em 폭)로 렌더해 OS별 가짜 볼드를 피한다 */
        #scheme text[style*='font-weight']{font-family:'JetBrains Mono', 'Pretendard Variable', monospace;}
        #scheme .pipe{fill:none;stroke:#3a4860;stroke-width:3;}
        #scheme .pipe-flow{fill:none;stroke:#36d9d9;stroke-width:2.4;stroke-dasharray:9 11;animation:pid-flow 1.4s linear infinite;}
        #scheme .pipe-elec{fill:none;stroke:#4aa8ff;stroke-width:1.6;stroke-dasharray:7 5;}
        #scheme .pipe-soft{fill:none;stroke:#37e88a;stroke-width:1.6;stroke-dasharray:2 4;}
        #scheme .sig-flow{fill:none;stroke:#4aa8ff;stroke-width:1.4;stroke-dasharray:6 4;animation:pid-flow 1.8s linear infinite;}
        @keyframes pid-flow{to{stroke-dashoffset:-40;}}
        #scheme .sym{stroke:#3a4860;stroke-width:2.2;fill:#101419;}
        #scheme .sym-fill{fill:#13181f;stroke:#3a4860;stroke-width:2.2;}
        #scheme .lbl-sm{font-size:9px;fill:#5a6a82;}
        #scheme .tag{font-size:10.5px;font-weight:800;fill:#c8d4e8;text-anchor:middle;font-family:'JetBrains Mono', 'Pretendard Variable', monospace;}
        #scheme .tagnum{font-size:9px;fill:#5a6a82;text-anchor:middle;}
        #scheme .bubble{fill:#101419;stroke:#3a4860;stroke-width:2;}
        #scheme .ctrl-loop-box{fill:rgba(240,180,41,.04);stroke:#f0b429;stroke-width:1;stroke-dasharray:5 3;}
        #scheme .ghost-box{fill:rgba(48,61,80,.06);stroke:#303d50;stroke-width:1.7;stroke-dasharray:7 5;}
        #scheme .ghost-text{font-size:10px;fill:#5a6a82;text-anchor:middle;}
        #scheme .filled-box{fill:rgba(55,232,138,.05);stroke:#37e88a;stroke-width:1.6;}
        #scheme .clickable:hover .sym,#scheme .clickable:hover .sym-fill,#scheme .clickable:hover .bubble{stroke:#4aa8ff;stroke-width:2.8;}
        #scheme .clickable:hover .hit{fill:rgba(74,168,255,.06);}
        .${s.panelHead} .ptag{font-size:11px;font-weight:800;font-family:'JetBrains Mono', 'Pretendard Variable', monospace;color:#4aa8ff;letter-spacing:0.02em;}
        .${s.panelHead} .ptype{font-size:11px;color:#5a6a82;}
        .${s.ro} .lab{font-size:9.5px;color:#5a6a82;letter-spacing:.3px;text-transform:uppercase;}
        .${s.ro} .val{font-size:17px;font-weight:800;font-family:'JetBrains Mono', 'Pretendard Variable', monospace;color:#ff5f57;margin-top:2px;font-variant-numeric:tabular-nums;}
        .${s.ro} .val.good{color:#37e88a;}
        .${s.titleMain} .sub{font-size:13px;color:#4aa8ff;font-weight:700;font-family:'JetBrains Mono', 'Pretendard Variable', monospace;margin-top:3px;letter-spacing:.5px;}
        .${s.tbCell} .k{font-size:8.5px;color:#5a6a82;text-transform:uppercase;letter-spacing:0.02em;}
        .${s.tbCell} .v{font-size:12px;font-weight:700;font-family:'JetBrains Mono', 'Pretendard Variable', monospace;color:#c8d4e8;margin-top:1px;}
      `}</style>
    </SceneHost>
  )
}
