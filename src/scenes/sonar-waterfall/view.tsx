'use client'

import type { Dispatch, Ref, RefObject, SetStateAction } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { CHANNELS } from './data'
import s from './scene.module.css'

interface SonarWaterfallViewProps {
  canvasRef: Ref<HTMLCanvasElement>
  selected: number | null
  setSelected: Dispatch<SetStateAction<number | null>>
  lutRef: RefObject<HTMLCanvasElement | null>
  feedRef: RefObject<HTMLDivElement | null>
  gainRef: RefObject<HTMLSpanElement | null>
  ampRef: RefObject<HTMLDivElement | null>
  forceRef: RefObject<HTMLDivElement | null>
  timeRef: RefObject<HTMLDivElement | null>
  weldRef: RefObject<HTMLDivElement | null>
  ampStatRef: RefObject<HTMLElement | null>
  sweepRef: RefObject<HTMLElement | null>
}

export function SonarWaterfallView({
  canvasRef,
  selected,
  setSelected,
  lutRef,
  feedRef,
  gainRef,
  ampRef,
  forceRef,
  timeRef,
  weldRef,
  ampStatRef,
  sweepRef,
}: SonarWaterfallViewProps) {
  const selectedChannel = selected === null ? null : CHANNELS[selected]

  return (
    <SceneHost className={s.root} bg="#02060c">
      <div className={s.shell}>
        <div className={s.topbar}>
          <div className={s.tag}>
            <span className={s.k}>SYSTEM</span>
            <span className={s.v}>ULTRASONIC WELD DOE</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>공정</span>
            <span className={`${s.v} ${s.amb}`}>초음파 용착 조건 최적화</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>METHOD</span>
            <span className={s.v}>실험계획법 DOE</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>초음파 AMP</span>
            <span className={s.v} ref={gainRef}>— μm</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>RESPONSE</span>
            <span className={s.v}>불량율 반응면</span>
          </div>
          <div className={s.sys}>
            <span className={s.title}><b>ULTRASONIC DOE</b> SIGNAL PORTFOLIO</span>
            <span className={s.blink} />
            <span className={s.runState}>DOE RUN</span>
          </div>
        </div>

        <div className={s.left}>
          <div className={s.ident}>
            <i className={`${s.corner} ${s.tl}`} />
            <i className={`${s.corner} ${s.tr}`} />
            <i className={`${s.corner} ${s.bl}`} />
            <i className={`${s.corner} ${s.br}`} />
            <div className={s.name}>ULTRASONIC DOE</div>
            <div className={s.role}>초음파 용착 DOE · 조건 최적화와 표준화</div>
            <div className={s.sub}>AMPLITUDE · FORCE · TIME · DEFECT RESPONSE</div>
          </div>

          <div className={s.sectlabel}>DOE 공정 채널 · 인자 배열</div>
          <div className={s.chlist}>
            {CHANNELS.map((ch, index) => (
              <button className={s.chrow} key={ch.id} type="button" onClick={() => setSelected(index)}>
                <span className={s.dot} style={{ background: ch.color, color: ch.color }} />
                <div>
                  <div className={s.cn}>{ch.id} · {ch.short}</div>
                  <div className={s.cname}>{ch.name}</div>
                </div>
                <span className={s.freq}><b>{ch.freq}</b>{ch.hz}</span>
                <span className={s.open}>▸ INSPECT</span>
              </button>
            ))}
          </div>

          <div className={s.legend}>
            <div className={s.sectlabel}>에너지 밀도 LUT</div>
            <div className={s.colorbar}><canvas className={s.lutbar} ref={lutRef} /></div>
            <div className={s.barscale}><span>저</span><span>중저</span><span>중고</span><span>고</span></div>
          </div>
        </div>

        <div className={s.center}>
          <canvas ref={canvasRef} className={s.waterfall} />
          <div className={s.ovlabel}>DOE RESPONSE SURFACE · <b>초음파 용착</b> · 진폭 × 가압력 × 용착시간 · t↓</div>
          <div className={s.nowline}><span>◀ CURRENT ROW</span></div>
          <div className={s.axisTime}>◀ DOE RUN 이력 ▶</div>
        </div>

        <div className={s.right}>
          <div className={s.sectlabel}>PROCESS READOUTS</div>
          <div className={s.readouts}>
            <div className={s.ro}><div className={s.l}>초음파 AMP</div><div className={s.n} ref={ampRef}>— μm</div></div>
            <div className={s.ro}><div className={s.l}>가압력 FORCE</div><div className={`${s.n} ${s.teal}`} ref={forceRef}>— N</div></div>
            <div className={s.ro}><div className={s.l}>용착시간 WELD</div><div className={s.n} ref={timeRef}>— s</div></div>
            <div className={s.ro}><div className={s.l}>불량율 DEFECT</div><div className={`${s.n} ${s.hot}`} ref={weldRef}>HOT</div></div>
            <div className={s.ro}><div className={s.l}>반응면 FIT</div><div className={`${s.n} ${s.teal}`}>RSM</div></div>
            <div className={s.ro}><div className={s.l}>표준화 STATUS</div><div className={`${s.n} ${s.teal}`}>LOCK</div></div>
          </div>
          <div className={s.evidence} aria-label="작은 증거 눈금">
            <span title="초음파 용착 DOE 전후 불량율 반응. 헤드라인이 아닌 검증 눈금으로만 표시">불량율 <b>15 → 0%대</b></span>
            <span title="재작업 공수 연 환산 근거. 상세 산식은 기술자료 근거 항목">재작업 <b>3,200만</b></span>
            <span title="폐기 비용 연 환산 근거. 단위 비용 기준의 보조 evidence">폐기 <b>3,600만</b></span>
          </div>

          <div className={s.sectlabel}>DOE EVENT LOG</div>
          <div className={s.feed} ref={feedRef} />
        </div>

        <div className={s.statusbar}>
          <div className={s.seg}>DOE 인자<b>진폭·가압력·용착시간</b></div>
          <div className={s.seg}>반응<b>불량율·붕괴량</b></div>
          <div className={s.seg}>초음파 AMP<b className={s.amb} ref={ampStatRef}>— μm</b></div>
          <div className={s.seg}>DOE 런 경과<b ref={sweepRef}>0.0 s</b></div>
          <div className={`${s.seg} ${s.right}`}>초음파 용착 DOE · 조건 최적화와 표준화 · 채널 클릭 시 상세 ▸</div>
        </div>
      </div>

      <div
        className={`${s.modal} ${selectedChannel ? s.on : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null)
        }}
      >
        {selectedChannel && (
          <div className={s.card}>
            <span className={s.x} onClick={() => setSelected(null)}>✕</span>
            <div className={s.chId}>{selectedChannel.id} · {selectedChannel.freq} CHANNEL</div>
            <h2>{selectedChannel.name}</h2>
            <div className={s.band}>{selectedChannel.band}</div>
            <div className={s.desc} dangerouslySetInnerHTML={{ __html: selectedChannel.desc }} />
            <div className={s.grpL}>DOE 조건 / 수준</div>
            <div className={s.stack}>
              {selectedChannel.stack.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className={s.grpL}>반응(RESPONSE) / 결과</div>
            <div className={s.out}>
              {selectedChannel.out.map((item) => (
                <div className={s.o} key={`${item[0]}-${item[1]}`}>
                  <div className={s.ol}>{item[0]}</div>
                  <div className={`${s.ov} ${item[2] === 'hot' ? s.hot : ''}`}>{item[1]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SceneHost>
  )

}
