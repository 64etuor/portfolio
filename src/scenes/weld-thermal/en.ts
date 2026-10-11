import { registerSceneText } from '../_host/localize'

/**
 * English projection of this scene's Korean copy (exact strings first, then word-level terms).
 * Program descriptions are injected as innerHTML, so each <b>/<span> fragment is its own text
 * node; the fragment translations below are written to read as one sentence when joined.
 */
registerSceneText({
  // ── HUD / header ──
  'LASER WELD / Nd:YAG · 정밀 접합': 'LASER WELD / Nd:YAG · precision joining',
  '전도형 → 키홀 → 심·중첩 → DOE 프로그램 순환': 'conduction → keyhole → seam/overlap → DOE program cycle',
  'Nd:YAG 1064nm 펄스 발진 · 전도형 / 키홀 / 심 · 패턴 용접':
    'Nd:YAG 1064nm pulsed · conduction / keyhole / seam · pattern welding',
  'Nd:YAG LASER WELDER · 1064nm 펄스 · 키홀 / 심 / 패턴 용접':
    'Nd:YAG LASER WELDER · 1064nm pulsed · keyhole / seam / pattern welding',
  '1064nm · 펄스 발진': '1064nm · pulsed',
  '전도형 ↔ 키홀 전이': 'conduction ↔ keyhole transition',
  '펄스에너지·PRF·피크출력': 'pulse energy·PRF·peak power',
  '심 용접 · 점 중첩(overlap)': 'seam welding · spot overlap',
  '패턴 경로 드로잉': 'pattern path drawing',
  '디포커스·스폿 제어': 'defocus·spot control',

  // ── live meters (label nodes end with &nbsp;, matched trimmed) ──
  '반복률 PRF': 'Rep. rate PRF',
  '펄스 폭': 'Pulse width',
  '용접 속도': 'Weld speed',
  '디포커스': 'Defocus',
  '점 피치·중첩': 'Spot pitch·overlap',
  '심 진행': 'Seam progress',
  '스패터': 'Spatter',

  // ── program cards ──
  '전도형 용접': 'Conduction welding',
  '얕고 넓은 비드 · 직선 심': 'shallow bead · line seam',
  '키홀 용접': 'Keyhole welding',
  '깊은 용입 · 곡선 추종': 'deep weld · curve path',
  '심 용접': 'Seam welding',
  '점 중첩 · 기밀 윤곽 심': 'overlap · sealed contour',
  '스티치 / 조건 창': 'Stitch / window',
  '펄스/디포커스 · 패턴': 'pulse/defocus · pattern',

  // ── program description: conduction ──
  '전도형(Conduction) 모드': 'Conduction mode',
  ': 파워밀도가 임계 이하라 표면만 녹는다. 디포커스':
    ': power density is below the threshold, so only the surface melts. A defocus of',
  '로 스폿을 키워 파워밀도를 낮추면': ' enlarges the spot and lowers power density, forming a',
  '얕고 넓은 비드': 'shallow, wide bead',
  '가 형성되고 아스펙트비가 1 미만이 된다. 헤드가': ' with an aspect ratio below 1. The head follows a',
  '직선 심': 'straight seam',
  '을 따라가며 넓은 비드를 그린다.': ' and draws a wide bead.',

  // ── program description: keyhole ──
  '키홀(Keyhole) 모드': 'Keyhole mode',
  ': 파워밀도가': ': once power density exceeds',
  '를 넘으면 금속이 증발해 증기압이 용탕을 밀어내고 깊은 구멍(키홀)을 뚫는다.':
    ', the metal vaporizes and vapor pressure pushes the melt pool aside, drilling a deep hole (the keyhole). Deep penetration at',
  '아스펙트비 ≈ 3': 'aspect ratio ≈ 3',
  '의 깊은 용입을': ' is traced precisely along a',
  '곡선 경로': 'curved path',
  '를 따라 정밀 추종하며 그린다. He로 플룸 억제.': '. He shielding suppresses the plume.',

  // ── program description: seam ──
  '심(Seam) 용접': 'Seam welding',
  ': 펄스 점용접을': ': pulsed spot welds overlap by the',
  '중첩률': 'overlap ratio',
  '로 겹쳐 연속 기밀 심을 만든다.': ' to form a continuous hermetic seam.',
  '속도 / PRF = 점 피치': 'Speed / PRF = spot pitch',
  '로 중첩이 결정된다. 헤드가 부품': ' sets the overlap. The head circles the part',
  '윤곽(닫힌 경로)': 'contour (closed path)',
  '을 한 바퀴 돌며 배터리 캔·센서 하우징의 기밀 심을 그린다.':
    ' once, drawing the hermetic seam of a battery can or sensor housing.',

  // ── program description: DOE / stitch ──
  '스티치 / 조건 창 DOE': 'Stitch / process window DOE',
  ': 펄스에너지·PRF·디포커스를 인자로, 헤드가 경로 위에':
    ': with pulse energy, PRF and defocus as factors, the head draws a',
  '스티치 패턴': 'stitch pattern',
  '(단속 점군)을 그린다. 전도형↔키홀': ' (intermittent spot cluster) along the path. The conduction↔keyhole',
  '전이 경계': 'transition boundary',
  '를 파워밀도 축에서 찾아 작업 창(window)을 표준화하고 단면·X선 CTQ를 등록한다.':
    ' is located on the power density axis to standardize the process window and register cross-section/X-ray CTQs.',
})
