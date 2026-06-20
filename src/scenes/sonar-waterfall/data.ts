type ChannelKey = 'amp' | 'force' | 'time' | 'weld'
export type EventTone = 'cy' | 'ok' | 'wn' | 'er'
type OutcomeTone = 'hot'

export interface Channel {
  id: string
  color: string
  key: ChannelKey
  name: string
  short: string
  freq: string
  hz: string
  band: string
  desc: string
  stack: string[]
  out: Array<[string, string, OutcomeTone?]>
  base: number
  var: number
  speed: number
  tick?: boolean
  spiky?: boolean
  weld?: boolean
}

export const CHANNELS: Channel[] = [
  {
    id: 'CH1',
    color: '#48e6ff',
    key: 'amp',
    name: '진폭 AMPLITUDE',
    short: '혼 진폭 · 에너지 투입',
    freq: 'AMP',
    hz: 'μm',
    band: 'ULTRASONIC WELD DOE · FACTOR A: 혼 진폭(Amplitude)',
    desc: '<em>진폭(Amplitude)</em>은 초음파 혼이 계면에 전달하는 기계적 에너지의 1차 인자다. 낮은 수준에서는 미용착(cold weld)과 박리 위험이 커지고, 높은 수준에서는 플래시(flash)·케이스 눌림·계면 손상이 증가한다. DOE에서는 진폭을 단독 조건으로 보지 않고 <em>가압력×용착시간</em>과 함께 반응면을 만든 뒤, 불량율과 붕괴량(collapse depth)이 동시에 안정되는 창을 찾는다.',
    stack: ['Factor A: 진폭(μm) 수준화', '혼 마모·팁 접촉 상태 확인', '미용착 하한 / 플래시 상한 경계', '가압력·시간과 교호작용 검토', '조건표 반영 전 확인 런'],
    out: [['주인자', '진폭(Amplitude)'], ['반응', '불량율 / 붕괴량'], ['경계', '미용착·플래시'], ['역할', '에너지 투입량 제어']],
    base: 0.46,
    var: 0.3,
    speed: 1.7,
  },
  {
    id: 'CH2',
    color: '#1ad6b4',
    key: 'force',
    name: '가압력 FORCE',
    short: '접촉압 · 에너지 전달',
    freq: 'FRCE',
    hz: 'N',
    band: 'ULTRASONIC WELD DOE · FACTOR B: 가압력(Force)',
    desc: '<em>가압력</em>은 혼 진동이 수지 계면으로 전달되는 접촉 조건을 정한다. 부족하면 계면 미끄럼과 에너지 손실이 커지고, 과하면 수지가 흐르기 전에 진동이 감쇠해 외관 눌림이나 용착 부족이 남는다. DOE에서는 진폭과 가압력의 교호작용을 우선 확인하고, 붕괴량 편차와 외관 변형이 동시에 낮아지는 압력 창을 표준 조건으로 고정한다.',
    stack: ['Factor B: 가압력(N) 수준화', '지그 클램핑 반복성 확인', '계면 미끄럼 / 과압 변형 경계', '진폭×가압력 교호작용', '압력 창 표준화'],
    out: [['주인자', '가압력(Force)'], ['반응', '붕괴량 편차'], ['경계', '미끄럼·과압'], ['역할', '접촉압 안정화']],
    base: 0.34,
    var: 0.1,
    speed: 0.32,
    tick: true,
  },
  {
    id: 'CH3',
    color: '#ffc24a',
    key: 'time',
    name: '용착·유지시간',
    short: 'Weld time · Hold time',
    freq: 'TIME',
    hz: 's',
    band: 'ULTRASONIC WELD DOE · FACTOR C: 용착시간 + HOLD 조건',
    desc: '<em>용착시간</em>은 에너지 투입 누적량을, <em>유지시간(Hold)</em>은 수지 계면이 압력 아래에서 고화되는 시간을 결정한다. 시간이 짧으면 계면 결합이 닫히지 않고, 길면 열 이력 과다로 케이스 변형과 플래시가 커진다. 조건 최적화는 진폭·가압력 수준과 함께 시간 축을 조절해 불량율 반응면의 고온 로브를 낮추는 방식으로 진행된다.',
    stack: ['Factor C: 용착시간(s) 수준화', 'Hold time 고화 조건', '과소 시간 미용착 경계', '과다 시간 외관 변형 경계', '검증 런 후 작업표준 반영'],
    out: [['주인자', '용착시간'], ['보조조건', 'Hold time'], ['반응', '외관·강도·불량율'], ['역할', '에너지 누적량 제어']],
    base: 0.3,
    var: 0.42,
    speed: 2.4,
    spiky: true,
  },
  {
    id: 'CH4',
    color: '#ff7a5c',
    key: 'weld',
    name: '불량율 반응',
    short: 'RESPONSE · evidence tick',
    freq: 'DFCT',
    hz: 'rate',
    band: 'RESPONSE SURFACE · 불량율(Defect Rate) · 초음파 용착 DOE',
    desc: 'DOE 반응(Response)은 <em>불량율</em>과 붕괴량 안정성을 함께 본다. 초기 조건에서는 불량율 고점이 반응면의 핫 로브로 나타났고, 진폭·가압력·용착시간의 조합을 조정하면서 결함 로브가 냉각되는지 확인했다. 정량 성과는 헤드라인으로 쓰지 않고 오른쪽의 작은 evidence rail에만 남겼다. 기술자료 작성·교육·검증 런과 표준화까지 담당했다.',
    stack: ['Response: 불량율 + 붕괴량 안정성', '핫 로브 원인: 조건 창 이탈', '최적점: 진폭×가압력×시간 교차점', '작업 근거: 작은 evidence rail로 분리', '보조 근거: 재작업·폐기 비용 rail에 격리'],
    out: [['반응', '불량율', 'hot'], ['표시 방식', '소눈금'], ['근거 위치', 'evidence rail'], ['표준화', '조건표 반영']],
    base: 0.3,
    var: 0.16,
    speed: 1.1,
    weld: true,
  },
]

export const LUT_STOPS: Array<[number, number, number, number]> = [
  [0.0, 2, 6, 16],
  [0.14, 6, 22, 54],
  [0.3, 10, 60, 120],
  [0.46, 16, 150, 170],
  [0.6, 40, 220, 200],
  [0.72, 120, 240, 180],
  [0.82, 240, 210, 90],
  [0.91, 255, 130, 50],
  [0.97, 255, 70, 40],
  [1.0, 255, 240, 220],
]

export const EVENT_POOL: Array<[EventTone, string, string]> = [
  ['cy', 'A', '진폭 수준표 설정 · 혼 팁 접촉면과 제품 지그 상태 확인'],
  ['ok', 'A', '중간 진폭 런 · 미용착 경계 이탈 · 플래시 없음'],
  ['wn', 'A', '상한 진폭 런 · 외관 눌림과 플래시 경계 접근'],
  ['cy', 'B', '가압력 수준표 설정 · 클램핑 반복성 확인'],
  ['ok', 'B', '중간 가압력 런 · 붕괴량 편차 안정'],
  ['wn', 'B', '과압 조건 · 진동 감쇠와 케이스 변형 경계 확인'],
  ['cy', 'C', '용착시간·Hold time 수준표 설정'],
  ['er', 'C', '과소 시간 런 · 계면 결합 미완료 · 불량 로브 기록'],
  ['wn', 'C', '과다 시간 런 · 열 이력 증가 · 외관 리스크 표시'],
  ['cy', 'R', '반응면 피팅 · 진폭×가압력×시간 교호작용 검토'],
  ['ok', 'R', '최적 후보 조건 검증 런 · 붕괴량과 외관 동시 확인'],
  ['ok', 'R', '불량율 정량 근거 · 작은 evidence rail에만 표시'],
  ['ok', 'R', '재작업·폐기 비용 근거 · 로그 헤드라인 제외'],
  ['ok', 'STD', '조건표·기술자료·교육안 반영 · 표준화 완료'],
]
