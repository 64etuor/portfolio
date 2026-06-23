'use client'

/* weld-thermal — static JSX layout; all DOM refs threaded in via props */

import type { RefObject, MutableRefObject, Ref } from 'react'
import { PROGRAMS } from './data'
import s from './scene.module.css'

export interface WeldThermalViewRefs {
  canvasRef: Ref<HTMLCanvasElement | null>
  modeTxtRef: RefObject<HTMLSpanElement | null>
  fiberTxtRef: RefObject<HTMLSpanElement | null>
  gasTxtRef: RefObject<HTMLSpanElement | null>
  focalRef: RefObject<HTMLSpanElement | null>
  spotDiaRef: RefObject<HTMLSpanElement | null>
  passNoRef: RefObject<HTMLSpanElement | null>
  modeChipRef: RefObject<HTMLSpanElement | null>
  mtSpatterRef: RefObject<HTMLSpanElement | null>
  gPeRef: RefObject<HTMLSpanElement | null>
  gPkRef: RefObject<HTMLSpanElement | null>
  gAvgRef: RefObject<HTMLSpanElement | null>
  dutyRef: RefObject<HTMLSpanElement | null>
  pdensRef: RefObject<HTMLSpanElement | null>
  penetRef: RefObject<HTMLSpanElement | null>
  beadwRef: RefObject<HTMLSpanElement | null>
  aspectRef: RefObject<HTMLSpanElement | null>
  mtPrfRef: RefObject<HTMLSpanElement | null>
  mtPwRef: RefObject<HTMLSpanElement | null>
  mtTravelRef: RefObject<HTMLSpanElement | null>
  mtDefocusRef: RefObject<HTMLSpanElement | null>
  mtPitchRef: RefObject<HTMLSpanElement | null>
  mtBeadRef: RefObject<HTMLSpanElement | null>
  arcTimeRef: RefObject<HTMLSpanElement | null>
  frameRef: RefObject<HTMLSpanElement | null>
  fpsRef: RefObject<HTMLSpanElement | null>
  clockRef: RefObject<HTMLElement | null>
  crossRef: RefObject<HTMLDivElement | null>
  spotTempRef: RefObject<HTMLSpanElement | null>
  spotNameRef: RefObject<HTMLSpanElement | null>
  laserOnRef: RefObject<HTMLSpanElement | null>
  arcPhaseRef: RefObject<HTMLSpanElement | null>
  arcBarRef: RefObject<HTMLElement | null>
  thPeakRef: RefObject<HTMLElement | null>
  thHazRef: RefObject<HTMLElement | null>
  thermCvRef: RefObject<HTMLCanvasElement | null>
  detailTxtRef: RefObject<HTMLDivElement | null>
  passRefs: MutableRefObject<HTMLDivElement[]>
}

interface WeldThermalViewProps extends WeldThermalViewRefs {
  onNudgeProgram: () => void
  onJumpTo: (index: number) => void
}

export function WeldThermalView({
  canvasRef,
  modeTxtRef,
  fiberTxtRef,
  gasTxtRef,
  focalRef,
  spotDiaRef,
  passNoRef,
  modeChipRef,
  mtSpatterRef,
  gPeRef,
  gPkRef,
  gAvgRef,
  dutyRef,
  pdensRef,
  penetRef,
  beadwRef,
  aspectRef,
  mtPrfRef,
  mtPwRef,
  mtTravelRef,
  mtDefocusRef,
  mtPitchRef,
  mtBeadRef,
  arcTimeRef,
  frameRef,
  fpsRef,
  clockRef,
  crossRef,
  spotTempRef,
  spotNameRef,
  laserOnRef,
  arcPhaseRef,
  arcBarRef,
  thPeakRef,
  thHazRef,
  thermCvRef,
  detailTxtRef,
  passRefs,
  onNudgeProgram,
  onJumpTo,
}: WeldThermalViewProps) {
  return (
    <>
      <canvas ref={canvasRef} className={s.c} />
      <div className={s.vig} />
      <div className={s.grain} />

      <div className={`${s.bracket} ${s.bTl}`} />
      <div className={`${s.bracket} ${s.bTr}`} />
      <div className={`${s.bracket} ${s.bBl}`} />
      <div className={`${s.bracket} ${s.bBr}`} />

      <div className={`${s.hud} ${s.tl}`}>
        <div className={s.l4}>
          <span className={s.gd} />
          <span className={s.em}>&#9888;</span> CLASS 4 · <span ref={laserOnRef}>LASER ON</span> · IPL INTERLOCK
        </div>
        <div className={s.rec} style={{ marginTop: 8 }}>
          <span className={s.dot} />
          LASER . LIVE
        </div>
        <div className={s.row}>
          <span className={s.k}>SOURCE</span>
          <b>Nd:YAG 1064nm</b>
        </div>
        <div className={s.row}>
          <span className={s.k}>MODE</span>
          <b ref={modeTxtRef}>PULSED</b>
        </div>
        <div className={s.row}>
          <span className={s.k}>FIBER</span>
          <b ref={fiberTxtRef}>Ø400 µm</b>
        </div>
        <div className={s.row}>
          <span className={s.k}>GAS</span>
          <b ref={gasTxtRef}>Ar 15 L/min</b>
        </div>
      </div>

      <div className={`${s.hud} ${s.tr}`}>
        <div className={s.big}>LASER WELDER . LW-300 Nd:YAG</div>
        <div>
          <span className={s.lbl}>FOCAL</span> <b ref={focalRef}>f160</b> &nbsp; <span className={s.lbl}>SPOT</span> <b ref={spotDiaRef}>Ø0.40</b>
        </div>
        <div>
          <span className={s.lbl}>FPS</span> <b ref={fpsRef}>60</b> &nbsp; <span className={s.lbl}>FRAME</span> <b ref={frameRef}>000000</b>
        </div>
        <div>
          <span className={s.lbl}>EMIT</span> <b ref={arcTimeRef}>0.0s</b> &nbsp; <span className={s.lbl}>SEAM</span> <b ref={passNoRef}>1</b>
        </div>
      </div>

      <div className={s.meters}>
        <div className={`${s.gauge} ${s.pe}`}>
          <div className={s.lab}>PULSE E</div>
          <div className={s.val}>
            <span ref={gPeRef}>18.0</span>
            <span className={s.u}>J</span>
          </div>
        </div>
        <div className={`${s.gauge} ${s.pk}`}>
          <div className={s.lab}>PEAK PWR</div>
          <div className={s.val}>
            <span ref={gPkRef}>4.5</span>
            <span className={s.u}>kW</span>
          </div>
        </div>
        <div className={`${s.gauge} ${s.avg}`}>
          <div className={s.lab}>AVG PWR</div>
          <div className={s.val}>
            <span ref={gAvgRef}>270</span>
            <span className={s.u}>W</span>
          </div>
        </div>
      </div>

      <div className={s.arcstate}>
        <span className={s.lbl}>PULSE</span> <span className={s.ph} ref={arcPhaseRef}>SHUTTER</span>
        <span className={s.bar}><i ref={arcBarRef} /></span>
        <span className={s.modechip} ref={modeChipRef}>CONDUCTION</span>
      </div>

      <div className={`${s.hud} ${s.stats}`}>
        <div>
          POWER DENSITY <span className={`${s.v} ${s.vmax}`} ref={pdensRef}>1.6e6 W/cm²</span>
        </div>
        <div>
          PENETRATION <span className={s.v} ref={penetRef}>0.8 mm</span> &nbsp; <span className={s.lbl}>W</span> <span className={s.v} ref={beadwRef}>0.9 mm</span>
        </div>
        <div>
          ASPECT <span className={`${s.v} ${s.vmin}`} ref={aspectRef}>0.9 : 1</span> &nbsp; <span className={s.lbl}>DUTY</span> <span className={s.v} ref={dutyRef}>6%</span>
        </div>
      </div>

      <div className={`${s.hud} ${s.br}`}>
        <div>
          <b ref={clockRef}>--:--:--.--</b>
        </div>
        <div>
          <span className={s.lbl}>CELL</span> <b>LASER WELD / Nd:YAG · 정밀 접합</b>
        </div>
        <div>
          <span className={s.lbl}>CTRL</span> <b>CNC-AUTO</b> &nbsp; <span className={s.lbl}>UNIT</span> <b>LWPS-07</b>
        </div>
      </div>

      <div className={s.crosshair} ref={crossRef}>
        <div className={s.h} />
        <div className={s.vLine} />
        <div className={s.ring} />
        <div className={s.spotlbl}>
          <span className={s.t} ref={spotTempRef}>1620C</span>
          <br />
          <span className={s.lbl} ref={spotNameRef}>MELT POOL</span>
        </div>
      </div>

      <div className={s.doe}>
        <div className={s.doebtn} onClick={onNudgeProgram}>
          &#9654; <span className={s.blink}>SEQ</span> 전도형 → 키홀 → 심·중첩 → DOE 프로그램 순환
        </div>
        <div className={s.doestate} />
      </div>

      <div className={s.thermbox}>
        <div className={s.cap}>THERMAL · MELT/HAZ MONITOR</div>
        <canvas className={s.thermcv} ref={thermCvRef} width={188} height={112} />
        <div className={s.rd}>
          T<sub>peak</sub> <b ref={thPeakRef}>1620C</b> &nbsp; HAZ <b ref={thHazRef}>OK</b>
        </div>
      </div>

      <div className={s.identity}>
        <div className={s.ey}>Nd:YAG PULSED LASER WELDER · 1064nm</div>
        <h1>
          LW-300<span className={s.sub}>Nd:YAG 1064nm 펄스 발진 · 전도형 / 키홀 / 심 · 패턴 용접</span>
        </h1>
        <div className={s.tags}>
          <span>1064nm · 펄스 발진</span>
          <span>전도형 ↔ 키홀 전이</span>
          <span>펄스에너지·PRF·피크출력</span>
          <span>심 용접 · 점 중첩(overlap)</span>
          <span>패턴 경로 드로잉</span>
          <span>디포커스·스폿 제어</span>
        </div>
      </div>

      <div className={s.metrics}>
        <div className={s.m}><span className={s.lab}>반복률 PRF &nbsp;</span><span className={`${s.num} ${s.up}`} ref={mtPrfRef}>15 Hz</span></div>
        <div className={s.m}><span className={s.lab}>펄스 폭 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtPwRef}>4.0 ms</span></div>
        <div className={s.m}><span className={s.lab}>용접 속도 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtTravelRef}>8.0 mm/s</span></div>
        <div className={s.m}><span className={s.lab}>디포커스 &nbsp;</span><span className={`${s.num} ${s.up}`} ref={mtDefocusRef}>0.0 mm</span></div>
        <div className={s.m}><span className={s.lab}>점 피치·중첩 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtPitchRef}>—</span></div>
        <div className={s.m}><span className={s.lab}>심 진행 &nbsp;</span><span className={`${s.num} ${s.up}`} ref={mtBeadRef}>0 mm</span></div>
        <div className={s.m}><span className={s.lab}>스패터 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtSpatterRef}>LOW</span></div>
      </div>

      <div className={s.detail}>
        <div className={s.desc} ref={detailTxtRef} dangerouslySetInnerHTML={{ __html: PROGRAMS[0].desc }} />
      </div>

      <div className={s.passes}>
        {PROGRAMS.map((program, i) => (
          <div
            className={`${s.pass} ${i === 0 ? s.active : ''}`}
            key={program.yr}
            ref={(el) => {
              if (el) passRefs.current[i] = el
            }}
            onClick={() => onJumpTo(i)}
          >
            <div className={s.yr}>{program.yr}</div>
            <div className={s.co}>{program.co}</div>
            <div className={s.ro}>{program.ro}</div>
            <div className={s.node} />
          </div>
        ))}
      </div>

      <div className={s.contact} />
    </>
  )
}
