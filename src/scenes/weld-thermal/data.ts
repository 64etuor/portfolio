type WeldRegime = 'conduction' | 'keyhole' | 'seam' | 'doe'
type WeldPath = 'line' | 'curve' | 'contour' | 'stitch'

export interface WeldProgram {
  yr: string
  co: string
  ro: string
  regime: WeldRegime
  path: WeldPath
  seamMM: number
  fiber: number
  gas: string
  focal: string
  pulseE: number
  peakKW: number
  pulseMs: number
  prf: number
  spotMM: number
  defocus: number
  travel: number
  penet: number
  beadW: number
  spatter: string
  desc: string
}

export const PROGRAMS = [
  {
    yr: 'CONDUCTION',
    co: '전도형 용접',
    ro: '얕고 넓은 비드 · 직선 심',
    regime: 'conduction',
    path: 'line',
    seamMM: 120,
    fiber: 400,
    gas: 'Ar 15 L/min',
    focal: 'f160',
    pulseE: 9.0,
    peakKW: 1.8,
    pulseMs: 5.0,
    prf: 12,
    spotMM: 0.60,
    defocus: 1.2,
    travel: 5.0,
    penet: 0.35,
    beadW: 1.10,
    spatter: 'NONE',
    desc:
      '<b>전도형(Conduction) 모드</b>: 파워밀도가 임계 이하라 표면만 녹는다. 디포커스 <b>+1.2mm</b>로 스폿을 키워 파워밀도를 낮추면 <span class="beam">얕고 넓은 비드</span>가 형성되고 아스펙트비가 1 미만이 된다. 헤드가 <b>직선 심</b>을 따라가며 넓은 비드를 그린다.',
  },
  {
    yr: 'KEYHOLE',
    co: '키홀 용접',
    ro: '깊은 용입 · 곡선 추종',
    regime: 'keyhole',
    path: 'curve',
    seamMM: 140,
    fiber: 400,
    gas: 'He 20 L/min',
    focal: 'f160',
    pulseE: 22.0,
    peakKW: 5.5,
    pulseMs: 4.0,
    prf: 18,
    spotMM: 0.40,
    defocus: 0.0,
    travel: 9.0,
    penet: 2.4,
    beadW: 0.85,
    spatter: 'LOW',
    desc:
      '<b>키홀(Keyhole) 모드</b>: 파워밀도가 <span class="hot">10^6 W/cm²</span>를 넘으면 금속이 증발해 증기압이 용탕을 밀어내고 깊은 구멍(키홀)을 뚫는다. <b>아스펙트비 ≈ 3</b>의 깊은 용입을 <span class="beam">곡선 경로</span>를 따라 정밀 추종하며 그린다. He로 플룸 억제.',
  },
  {
    yr: 'SEAM · CONTOUR',
    co: '심 용접',
    ro: '점 중첩 · 기밀 윤곽 심',
    regime: 'seam',
    path: 'contour',
    seamMM: 200,
    fiber: 400,
    gas: 'Ar 18 L/min',
    focal: 'f120',
    pulseE: 14.0,
    peakKW: 3.8,
    pulseMs: 3.5,
    prf: 22,
    spotMM: 0.45,
    defocus: 0.3,
    travel: 7.0,
    penet: 1.3,
    beadW: 0.95,
    spatter: 'LOW',
    desc:
      '<b>심(Seam) 용접</b>: 펄스 점용접을 <b>중첩률</b>로 겹쳐 연속 기밀 심을 만든다. <b>속도 / PRF = 점 피치</b>로 중첩이 결정된다. 헤드가 부품 <span class="beam">윤곽(닫힌 경로)</span>을 한 바퀴 돌며 배터리 캔·센서 하우징의 기밀 심을 그린다.',
  },
  {
    yr: 'DOE · STITCH',
    co: '스티치 / 조건 창',
    ro: '펄스/디포커스 · 패턴',
    regime: 'doe',
    path: 'stitch',
    seamMM: 120,
    fiber: 400,
    gas: 'Ar 15 L/min',
    focal: 'f160',
    pulseE: 16.0,
    peakKW: 4.0,
    pulseMs: 4.0,
    prf: 16,
    spotMM: 0.50,
    defocus: 0.6,
    travel: 6.0,
    penet: 1.0,
    beadW: 1.00,
    spatter: 'LOW',
    desc:
      '<b>스티치 / 조건 창 DOE</b>: 펄스에너지·PRF·디포커스를 인자로, 헤드가 경로 위에 <b>스티치 패턴</b>(단속 점군)을 그린다. 전도형↔키홀 <b>전이 경계</b>를 파워밀도 축에서 찾아 작업 창(window)을 표준화하고 단면·X선 CTQ를 등록한다.',
  },
] satisfies readonly WeldProgram[]

export const LUT = (() => {
  const lut = new Uint8Array(256 * 3)
  type Stop = readonly [number, number, number, number]
  const stops: readonly Stop[] = [
    [0.00, 3, 2, 6],
    [0.14, 30, 8, 22],
    [0.30, 110, 20, 30],
    [0.46, 196, 50, 26],
    [0.60, 240, 108, 30],
    [0.74, 255, 168, 52],
    [0.86, 255, 214, 120],
    [0.95, 230, 244, 255],
    [1.00, 255, 255, 255],
  ]

  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let a: Stop = stops[0]
    let b: Stop = stops[stops.length - 1]
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s]
        b = stops[s + 1]
        break
      }
    }
    const span = b[0] - a[0] || 1
    const f = (t - a[0]) / span
    lut[i * 3] = (a[1] + (b[1] - a[1]) * f) | 0
    lut[i * 3 + 1] = (a[2] + (b[2] - a[2]) * f) | 0
    lut[i * 3 + 2] = (a[3] + (b[3] - a[3]) * f) | 0
  }

  return lut
})()
