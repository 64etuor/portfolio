export type CompanyKey = 'eun' | 'elen' | 'sol' | 'mir'
type CodeChunk = [kind: 'mv' | 'pt' | 'sp' | 'cm', text?: string]
export type Six = [number, number, number, number, number, number]
export type IoKey = 'do1' | 'do2' | 'ro2' | 'do5' | 'do6' | 'di10' | 'di15' | 'di16' | 'di1' | 'do8'

export interface Company {
  name: string
  color: string
  cls: string
}

export interface Waypoint {
  id: number
  co: CompanyKey
  speed: number
  motn: string
  code: CodeChunk[]
  company: string
  role: string
  period: string
  desc: string
  regs: Array<[string, string?]>
  tool: string
  pose: Six
  world: Six
  joint: Six
  weld?: {
    force: number
    cur: number
    on: number
    hold: number
  }
}

export type ProgramRow =
  | { t: 'mv'; wp: number }
  | { t: 'hdr' | 'set' | 'cm' | 'io' | 'end'; code: CodeChunk[] }

export interface IoMapItem {
  id: string
  lab: string
  k: IoKey
  r?: boolean
}

export const COMPANY: Record<CompanyKey, Company> = {
  eun: { name: '스팟 용접 교시', color: '#ff7a8a', cls: 'b-eun' },
  elen: { name: 'PLC 시퀀스', color: '#ffb454', cls: 'b-elen' },
  sol: { name: '취출 로봇 개조', color: '#54d6ff', cls: 'b-sol' },
  mir: { name: 'JIG 연동', color: '#c9a3ff', cls: 'b-mir' },
}

/* Each waypoint carries authentic teach-pendant readouts.
   world = [X,Y,Z (mm), W,P,R (deg)]  · joint = [J1..J6 (deg)]
   weld  = 스팟 용접 스케줄(예시값 [확인필요]) — 가압력/전류/통전/홀드
   [확인필요] 모든 좌표·관절각·용접조건은 실제 작업 방식 기반 예시값(실측 아님). */
export const WAYPOINTS: Waypoint[] = [
  {
    id: 1,
    co: 'eun',
    speed: 30,
    motn: 'FINE',
    code: [
      ['mv', 'J'],
      ['pt', ' P[1]'],
      ['sp', ' 30% FINE'],
      ['cm', '  ; 용접 접근 — 가압 전 위치 교시'],
    ],
    company: '스팟 용접 포인트 교시',
    role: '티치펜던트 직접 교시 · 용접 접근점',
    period: 'SPOT WELD TEACH · P[1] APPROACH',
    desc: '티치펜던트로 용접 건의 접근 포인트(P[1])를 직접 교시. 간섭 없는 자세(W/P/R)와 경로를 조그 조작으로 확정·기록한다. [좌표는 예시값]',
    regs: [
      ['P[1]', '접근 포인트'],
      ['JOG→기록', '직접 교시'],
      ['W/P/R', '경로 확정'],
    ],
    tool: 'UT:1 [WELD-GUN]',
    pose: [-42, 28, -38, 0, 35, 10],
    world: [537.2, 164.4, 312.8, 178.5, 1.2, -90.0],
    joint: [-42.0, 28.4, -38.1, 0.2, 35.6, 9.8],
  },
  {
    id: 2,
    co: 'eun',
    speed: 10,
    motn: 'FINE',
    weld: { force: 2.45, cur: 9.6, on: 14, hold: 10 },
    code: [
      ['mv', 'L'],
      ['pt', ' P[2]'],
      ['sp', ' 10% FINE'],
      ['cm', '  ; 용접점#1 — SPOT[SD=1] 가압→통전→유지'],
    ],
    company: '스팟 용접 동작 시퀀스',
    role: '용접점#1 교시 · 가압→통전→유지 I/O 제어',
    period: 'SPOT WELD SEQ · 가압 DO[1] / 통전 DO[2]',
    desc: 'P[2] 도달 후 DO[1]=ON(가압)→통전 대기→DO[2]=ON(통전)→유지→DO[2]/DO[1]=OFF 순으로 I/O 제어. 단계별 지연은 건 사양에 따라 조정. [좌표·용접조건 예시값]',
    regs: [
      ['DO[1]', '가압'],
      ['DO[2]', '통전'],
      ['유지 200ms', ''],
      ['FINE', ''],
    ],
    tool: 'UT:1 [WELD-GUN]',
    pose: [-8, 52, -64, 5, 40, -12],
    world: [612.0, 88.6, 241.5, 179.2, 0.4, -90.4],
    joint: [-8.0, 52.1, -64.3, 5.1, 40.2, -12.4],
  },
  {
    id: 3,
    co: 'eun',
    speed: 10,
    motn: 'FINE',
    weld: { force: 1.9, cur: 7.8, on: 9, hold: 8 },
    code: [
      ['mv', 'L'],
      ['pt', ' P[3]'],
      ['sp', ' 10% FINE'],
      ['cm', '  ; 용접점#2 — SPOT[SD=2] 박판 저전류'],
    ],
    company: '스팟 용접점#2 교시',
    role: '박판 구간 · 저전류 스케줄 SD=2',
    period: 'SPOT WELD SEQ · SD=2 (박판)',
    desc: '박판 적층부 용접점(P[3]). 표면 압흔·날림(expulsion) 방지를 위해 전류·가압을 낮춘 별도 스케줄(SD=2)을 적용. 통전 시간 단축. [용접조건 예시값]',
    regs: [
      ['SD=2', '박판'],
      ['저전류', ''],
      ['압흔 방지', ''],
    ],
    tool: 'UT:1 [WELD-GUN]',
    pose: [6, 44, -56, -3, 38, -6],
    world: [648.3, 12.1, 268.9, 179.8, -0.6, -89.7],
    joint: [6.0, 44.2, -56.0, -3.1, 38.4, -6.2],
  },
  {
    id: 4,
    co: 'eun',
    speed: 25,
    motn: 'CNT10',
    weld: { force: 2.45, cur: 9.4, on: 14, hold: 10 },
    code: [
      ['mv', 'L'],
      ['pt', ' P[4]'],
      ['sp', ' 25% CNT10'],
      ['cm', '  ; 용접점#3 — SPOT[SD=1] 본딩'],
    ],
    company: '스팟 용접점#3 교시',
    role: '본딩 구간 · CNT10 블렌딩 이동',
    period: 'SPOT WELD SEQ · SD=1 / CNT10',
    desc: '용접점 간 이동은 CNT10으로 블렌딩해 사이클 단축, 용접점 자체는 FINE 정지로 위치 정밀 확보. 가압→통전→유지 표준 스케줄(SD=1). [좌표·조건 예시값]',
    regs: [
      ['CNT10', '블렌딩'],
      ['SD=1', ''],
      ['사이클↓', ''],
    ],
    tool: 'UT:1 [WELD-GUN]',
    pose: [22, 36, -48, -6, 34, 4],
    world: [690.7, -64.2, 290.1, 178.9, 1.0, -90.2],
    joint: [22.0, 36.3, -48.1, -6.0, 34.1, 4.4],
  },
  {
    id: 5,
    co: 'eun',
    speed: 30,
    motn: 'FINE',
    code: [
      ['mv', 'J'],
      ['pt', ' P[5]'],
      ['sp', ' 30% FINE'],
      ['cm', '  ; 건 후퇴 — 팁 드레싱 위치 회피'],
    ],
    company: '용접 건 후퇴 / 팁 점검',
    role: '건 후퇴 · TIP DRESS 위치 회피',
    period: 'GUN RETRACT · RO[2] 후퇴 확인',
    desc: '용접 완료 후 건 후퇴(RO[2]=ON 확인). 팁 마모 누적 시 드레싱 위치로 이동하는 분기를 인터락으로 구성. 후퇴 미완료 시 다음 이동 금지. [좌표 예시값]',
    regs: [
      ['RO[2]', '후퇴 확인'],
      ['TIP DRESS', ''],
      ['인터락', ''],
    ],
    tool: 'UT:1 [WELD-GUN]',
    pose: [18, 30, -42, 0, 30, 8],
    world: [661.4, -52.0, 360.6, 179.0, 0.2, -90.0],
    joint: [18.0, 30.1, -42.2, 0.1, 30.3, 8.2],
  },
  {
    id: 6,
    co: 'elen',
    speed: 50,
    motn: 'CNT30',
    code: [
      ['mv', 'J'],
      ['pt', ' P[6]'],
      ['sp', ' 50% CNT30'],
      ['cm', '  ; PLC 시퀀스 — 취출 로봇 제어'],
    ],
    company: 'PLC 시퀀스 · 취출 로봇',
    role: '취출로봇 31대 개조·개선 · 모터 구동',
    period: 'PLC SEQ · STEP 제어 · 인터락',
    desc: '단축·취출로봇 동작을 PLC 스텝 시퀀스로 제어. 취출로봇 31대 개조·모터 구동 시퀀스 재설정. 인터락: DI[10](금형 열림)=ON 후 취출 개시.',
    regs: [
      ['취출×31', '개조'],
      ['PLC STEP', ''],
      ['DI[10]', '인터락'],
    ],
    tool: 'UT:2 [EXTRACT-ARM]',
    pose: [30, 40, -50, -8, 30, 24],
    world: [502.8, -210.5, 232.0, 174.6, -2.4, -78.1],
    joint: [30.0, 40.2, -50.1, -8.2, 30.0, 24.3],
  },
  {
    id: 7,
    co: 'sol',
    speed: 60,
    motn: 'CNT30',
    code: [
      ['mv', 'L'],
      ['pt', ' P[7]'],
      ['sp', ' 60% CNT30'],
      ['cm', '  ; Pin Point GATE 취출 중 커팅'],
    ],
    company: 'GATE 취출 / 커팅',
    role: 'Pin Point GATE 취출 동작 중 커팅',
    period: 'EXTRACT · DO[6] GATE 커팅',
    desc: 'Pin Point GATE 취출 동작 중 커팅 시퀀스. 취출 전진(DO[5])→GATE 커팅(DO[6])→후퇴를 PLC 인터락과 연동, 사출 불량 없이 안정 취출. [동작 예시]',
    regs: [
      ['DO[5]', '전진'],
      ['DO[6]', '커팅'],
      ['GATE', ''],
    ],
    tool: 'UT:2 [EXTRACT-ARM]',
    pose: [44, 30, -42, -4, 26, 30],
    world: [430.1, -298.7, 270.4, 171.0, -3.8, -70.5],
    joint: [44.0, 30.4, -42.0, -4.1, 26.2, 30.1],
  },
  {
    id: 8,
    co: 'mir',
    speed: 80,
    motn: 'FINE',
    code: [
      ['mv', 'J'],
      ['pt', ' P[8]'],
      ['sp', ' 80% FINE'],
      ['cm', '  ; JIG 연동 — CLAMP CHK 후 진입'],
    ],
    company: '엔드밀 사상 JIG 연동',
    role: 'JIG 인터락 · 진입/후퇴 시퀀스',
    period: 'JIG INTERLOCK · CLAMP CHK → 진입',
    desc: '엔드밀 사상 JIG 클램프 완료(DI[15]=ON) 확인 후 진입(P[8]). 사상 완료(DI[16]=ON) 시 자동 후퇴. 신호 미수신 시 WAIT — 강제 진입 금지 인터락. [좌표 예시값]',
    regs: [
      ['DI[15]', 'CLAMP'],
      ['WAIT', ''],
      ['진입 금지', ''],
    ],
    tool: 'UT:3 [JIG-EOAT]',
    pose: [64, 18, -30, 12, 48, -20],
    world: [318.5, -402.9, 188.7, 165.2, -6.1, -58.3],
    joint: [64.0, 18.3, -30.2, 12.1, 48.0, -20.4],
  },
  {
    id: 9,
    co: 'mir',
    speed: 80,
    motn: 'FINE',
    code: [
      ['mv', 'L'],
      ['pt', ' P[9]'],
      ['sp', ' 80% FINE'],
      ['cm', '  ; 사상 완료 — DI[16] 확인 후 후퇴'],
    ],
    company: '사상 완료 / 자동 후퇴',
    role: 'DI[16] 확인 → 자동 후퇴 경로',
    period: 'JIG · DI[16]=ON → RETRACT',
    desc: '엔드밀 사상 완료 신호(DI[16]=ON) 수신 시 후퇴 경로(P[9]) 실행. 후퇴 완료(RO[3]) 확인 후 다음 사이클 대기. JIG 클램프 해제 신호 연동. [좌표 예시값]',
    regs: [
      ['DI[16]', '사상완료'],
      ['RO[3]', '후퇴'],
      ['해제', ''],
    ],
    tool: 'UT:3 [JIG-EOAT]',
    pose: [50, 24, -36, 6, 40, -10],
    world: [372.0, -344.1, 256.3, 168.7, -4.0, -64.9],
    joint: [50.0, 24.2, -36.1, 6.0, 40.3, -10.2],
  },
  {
    id: 10,
    co: 'elen',
    speed: 60,
    motn: 'FINE',
    code: [
      ['mv', 'J'],
      ['pt', ' P[10]'],
      ['sp', ' 60% FINE'],
      ['cm', '  ; 홈 복귀 — 사이클 종료'],
    ],
    company: '홈 복귀 / 사이클 종료',
    role: 'HOME 복귀 · 사이클 카운트',
    period: 'HOME · END OF CYCLE',
    desc: '전 공정 완료 후 홈 포지션(P[10]) 복귀, 사이클 카운터 +1. 안전 영역 확인 후 다음 투입 대기. T1(교시)→T2(검증)→AUTO(양산) 단계 전환. [좌표 예시값]',
    regs: [
      ['HOME', ''],
      ['CYCLE +1', ''],
      ['대기', ''],
    ],
    tool: 'UT:1 [WELD-GUN]',
    pose: [0, 12, -18, 0, 22, 0],
    world: [480.0, 0.0, 480.0, 180.0, 0.0, -90.0],
    joint: [0.0, 12.0, -18.0, 0.0, 22.0, 0.0],
  },
]

/* full teach program listing (TP syntax) — order-of-execution.
   wp = index into WAYPOINTS for move/spot lines that drive arm+detail.
   [확인필요] illustrative speeds/signals — structure reflects real teach workflow. */
export const PROGRAM: ProgramRow[] = [
  { t: 'hdr', code: [['cm', '/PROG  SPOT_WLD']] },
  { t: 'hdr', code: [['cm', '/ATTR  GROUP[1] · 6AX · PAYLOAD 용접건']] },
  {
    t: 'set',
    code: [
      ['sp', 'UFRAME[1]'],
      ['sp', ' UTOOL[1]'],
      ['cm', '   ; 차체 지그 기준 / 용접건 TCP'],
    ],
  },
  { t: 'set', code: [['sp', 'PAYLOAD[2]'], ['cm', '            ; SERVO GUN 92kg']] },
  { t: 'cm', code: [['cm', '; ===== 스팟 용접 #1~#3 좌표 교시 =====']] },
  { t: 'mv', wp: 0 },
  { t: 'mv', wp: 1 },
  { t: 'io', code: [['sp', '  SPOT[SD=1,P=1,t=1]'], ['cm', ' ; 가압→통전→유지']] },
  { t: 'mv', wp: 2 },
  { t: 'io', code: [['sp', '  SPOT[SD=2,P=1,t=2]'], ['cm', ' ; 박판 저전류']] },
  { t: 'mv', wp: 3 },
  { t: 'io', code: [['sp', '  SPOT[SD=1,P=1,t=3]'], ['cm', ' ; 본딩']] },
  { t: 'mv', wp: 4 },
  { t: 'io', code: [['sp', '  WAIT RO[2]=ON'], ['cm'], ['cm', '  ; 건 후퇴 확인']] },
  { t: 'cm', code: [['cm', '; ===== PLC 연동 / 취출·JIG 인터락 =====']] },
  { t: 'mv', wp: 5 },
  { t: 'io', code: [['sp', '  WAIT DI[10]=ON'], ['cm'], ['cm', '  ; 금형 열림']] },
  { t: 'mv', wp: 6 },
  { t: 'io', code: [['sp', '  DO[6]=ON'], ['cm'], ['cm', '        ; GATE 커팅']] },
  { t: 'io', code: [['sp', '  WAIT DI[15]=ON'], ['cm'], ['cm', '  ; JIG CLAMP']] },
  { t: 'mv', wp: 7 },
  { t: 'io', code: [['sp', '  WAIT DI[16]=ON'], ['cm'], ['cm', '  ; 사상 완료']] },
  { t: 'mv', wp: 8 },
  { t: 'mv', wp: 9 },
  { t: 'end', code: [['sp', '[ END ]']] },
]

export const HOME: Six = [0, 12, -18, 0, 22, 0]

export const SKILLS = [
  '스팟 용접 교시',
  '티치펜던트 직접 교시',
  '포인트 교시 P[ ]',
  '자세 W/P/R 설정',
  '가압→통전→유지',
  'I/O DO/DI 인터락',
  'PLC 시퀀스 설계',
  '취출로봇 개조×31',
  '모터 구동 시퀀스',
  'Pin Point GATE 커팅',
  '엔드밀 사상 JIG 연동',
  'WAIT 조건 인터락',
  'CNT/FINE 블렌딩',
  '설비 PM/BM',
  '4M 관리',
  'Jig 개발',
  'Draftsight',
  'PFMEA/CP',
  'SOP 작성',
  'IATF16949',
]

export const IO_MAP: IoMapItem[] = [
  { id: 'DO[1]', lab: '용접 가압', k: 'do1' },
  { id: 'DO[2]', lab: '통전 신호', k: 'do2', r: true },
  { id: 'RO[2]', lab: '건 후퇴', k: 'ro2' },
  { id: 'DO[5]', lab: '취출 전진', k: 'do5' },
  { id: 'DO[6]', lab: 'GATE 커팅', k: 'do6', r: true },
  { id: 'DI[10]', lab: '금형 열림', k: 'di10' },
  { id: 'DI[15]', lab: 'JIG CLAMP', k: 'di15' },
  { id: 'DI[16]', lab: '사상 완료', k: 'di16' },
  { id: 'DI[1]', lab: '안전 인터락', k: 'di1' },
  { id: 'DO[8]', lab: '취출 완료', k: 'do8' },
]

export const INITIAL_IOST: Record<IoKey, number> = {
  do1: 0,
  do2: 0,
  ro2: 1,
  do5: 0,
  do6: 0,
  di10: 0,
  di15: 0,
  di16: 0,
  di1: 1,
  do8: 0,
}

export const PLC_SEQ = [
  { s: '01', c: '운전 준비 · 원점 확인', o: 'M100' },
  { s: '02', c: 'DI[10] 금형 열림 = ON', o: 'M101' },
  { s: '03', c: '취출로봇 전진 (단축 SV ON)', o: 'DO[5]' },
  { s: '04', c: 'Pin Point GATE 커팅 실행', o: 'DO[6]' },
  { s: '05', c: '커팅 완료 · 취출 후퇴', o: 'DO[7]' },
  { s: '06', c: 'DI[15] JIG CLAMP = ON 대기', o: 'TIM05' },
  { s: '07', c: '로봇 JIG 진입 허가', o: 'DO[9]' },
  { s: '08', c: 'DI[16] 사상 완료 = ON', o: 'M108' },
  { s: '09', c: '자동 후퇴 · 취출 완료 신호', o: 'DO[8]' },
  { s: '10', c: '인터락 OK · 다음 사이클 RST', o: 'M110' },
]

export const WP_IO: Array<{ set: Partial<Record<IoKey, number>>; plc: number }> = [
  { set: { ro2: 1 }, plc: 0 },
  { set: { do1: 1, do2: 1, ro2: 0 }, plc: 0 },
  { set: { do1: 1, do2: 1 }, plc: 0 },
  { set: { do1: 1, do2: 1 }, plc: 0 },
  { set: { do1: 0, do2: 0, ro2: 1 }, plc: 1 },
  { set: { di10: 1, do5: 1 }, plc: 2 },
  { set: { do6: 1, do5: 0 }, plc: 3 },
  { set: { di15: 1, do6: 0 }, plc: 6 },
  { set: { di16: 1, do8: 1 }, plc: 8 },
  { set: { do1: 0, do2: 0, do5: 0, do6: 0, di10: 0, di15: 0, di16: 0, do8: 0, ro2: 1 }, plc: 9 },
]

export const BG_EVENTS = [
  { cls: 'ev-io', t: 'DO[1]=ON · 용접 건 가압 시작' },
  { cls: 'ev-io', t: 'WAIT 0.30s · 가압 안정 대기' },
  { cls: 'ev-io', t: 'DO[2]=ON · 통전 개시' },
  { cls: 'ev-io', t: 'WAIT 0.50s · 용접 유지' },
  { cls: 'ev-io', t: 'DO[2]=OFF · 통전 해제' },
  { cls: 'ev-io', t: 'DO[1]=OFF · 가압 해제 · 이동 재개' },
  { cls: 'ev-reach', t: 'P[2] 용접 완료 · FINE STOP OK' },
  { cls: 'ev-io', t: 'DI[10]=ON CHK · 금형 열림 확인' },
  { cls: 'ev-io', t: 'PLC STEP 03 → 취출 동작 개시' },
  { cls: 'ev-io', t: 'DO[5]=ON · 취출 로봇 전진' },
  { cls: 'ev-io', t: 'DO[6]=ON · GATE 커팅 실행' },
  { cls: 'ev-reach', t: 'GATE 커팅 완료 · 취출 로봇 후퇴' },
  { cls: 'ev-io', t: 'DI[15]=ON CHK · JIG 클램프 완료' },
  { cls: 'ev-io', t: 'PLC STEP 07 → 로봇 JIG 진입' },
  { cls: 'ev-reach', t: 'DI[16]=ON · 사상 완료 · 후퇴 실행' },
  { cls: 'ev-warn', t: '인터락 CHK: DI[10] 미수신 · 대기 중' },
  { cls: 'ev-io', t: 'DO[3]=ON · 단축 로봇 모터 구동' },
  { cls: 'ev-reach', t: 'CYCLE 정상 완료 · 다음 STEP 대기' },
]
