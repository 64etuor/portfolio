// 갤러리 정본 데이터 — public/lab/scenes.html + skills*.html 에서 한국어 카피 그대로 옮김.
// file = 씬 basename(catalog key 와 동일).

import { SCENE_CATALOG } from '@/scenes/catalog'
import { copy, type LocalizedString } from '@/i18n/content'

// file = catalog key — 오타/구식 키는 컴파일 실패.
type SceneFileKey = (typeof SCENE_CATALOG)[number]['key']

export interface GalleryCard {
  file: SceneFileKey
  title: LocalizedString
  tag: LocalizedString
  desc: LocalizedString
}

export type SkillAreaKey = 'pm' | 'process' | 'dev' | 'infra' | 'pkm'

export interface SkillArea {
  key: SkillAreaKey
  label: LocalizedString
  blurb: LocalizedString
  cards: GalleryCard[]
}

const card = (file: SceneFileKey, titleKo: string, titleEn: string, tagKo: string, tagEn: string, descKo: string, descEn: string): GalleryCard => ({
  file,
  title: copy(titleKo, titleEn),
  tag: copy(tagKo, tagEn),
  desc: copy(descKo, descEn),
})

// scenes.html — 부팅 + SCENE 01–10 + 엔딩, 서사 순서대로 (12장).
export const SCENES_GALLERY: GalleryCard[] = [
  card('05-bios-boot', '콜드 오픈 · 시스템 부팅', 'Cold Open · System Boot', 'Boot', 'Boot', 'POST → SYSTEM READY. 필름이 기계처럼 부팅하며 열린다.', 'POST → SYSTEM READY. The film opens as a machine coming online.'),
  card('42-era-shift', 'SCENE 01 · 시대 — THE ACCELERATION', 'SCENE 01 · Era — THE ACCELERATION', 'Scene 01', 'Scene 01', '시대는 빠르게 변하고 있습니다 — 가속하는 시대의 오프닝.', 'The world is changing quickly — an opening for an accelerating era.'),
  card('33-ax-era', 'SCENE 02 · 선언 — AX ERA', 'SCENE 02 · Declaration — AX ERA', 'Scene 02', 'Scene 02', 'DX를 넘어 AX의 시대. 데이터·지식이 경쟁력으로 솟아오른다.', 'Beyond DX lies the AX era, where data and knowledge become competitive advantage.'),
  card('28-gap-reality', 'SCENE 03 · 현실 — THE DIVERGENCE', 'SCENE 03 · Reality — THE DIVERGENCE', 'Scene 03', 'Scene 03', '기대선과 성과선이 갈라지는 void — 현실의 격차.', 'A void where expectations and outcomes diverge — the gap in reality.'),
  card('29-lost-in-translation', 'SCENE 04 · 소통 — LOST IN TRANSLATION', 'SCENE 04 · Communication — LOST IN TRANSLATION', 'Scene 04', 'Scene 04', '기술은 손실 있는 번역 레이어, 핵심은 소통.', 'Technology is a lossy translation layer; communication is the essential part.'),
  card('41-perspectives', 'SCENE 05 · 관점 — PERSPECTIVES', 'SCENE 05 · Perspective — PERSPECTIVES', 'Scene 05', 'Scene 05', 'RACK FOCUS — 현장↔시스템, 초점이 오가며 한쪽은 또렷·한쪽은 안개.', 'RACK FOCUS — the lens shifts between the field and the system; one sharp, one blurred.'),
  card('30-collision', 'SCENE 06 · 충돌 — LEXICAL COLLISION', 'SCENE 06 · Collision — LEXICAL COLLISION', 'Scene 06', 'Scene 06', '언어가 정면충돌, 요구사항이 찢긴다 (클라이맥스).', 'Languages collide head-on and requirements tear apart (the climax).'),
  card('31-cost-cascade', 'SCENE 07 · 비용 — COST CASCADE', 'SCENE 07 · Cost — COST CASCADE', 'Scene 07', 'Scene 07', '한 점의 어긋남이 세 갈래의 비용으로 이어진다.', 'One misalignment cascades into costs on three fronts.'),
  card('32-the-connector', 'SCENE 08 · 연결 — THE CONNECTOR', 'SCENE 08 · Connection — THE CONNECTOR', 'Scene 08', 'Scene 08', '분열을 잇는 단 하나의 연결 — 현장과 기술을 잇는 사람.', 'One connection that bridges the divide — the person joining fieldwork and technology.'),
  card('36-bridge-experts', 'SCENE 09 · 해결 — THE BRIDGE', 'SCENE 09 · Solution — THE BRIDGE', 'Scene 09', 'Scene 09', '제조↔디지털을 한 사람이 양방향으로 잇는 양손잡이 전문가.', 'A cross-functional expert connecting manufacturing and digital work in both directions.'),
  card('37-cross-domain', 'SCENE 10 · 핵심 — CROSS-DOMAIN', 'SCENE 10 · Core — CROSS-DOMAIN', 'Scene 10', 'Scene 10', '경계를 넘는 지식의 교집합이 경쟁력으로 점화.', 'The intersection of knowledge across boundaries ignites competitive advantage.'),
  card('38-ending-catchphrase', '엔딩 · 미래를 만드는 사람', 'Ending · The People Who Make the Future', 'Ending', 'Ending', 'THE MAKERS — "미래를 만드는 사람." 캐치프레이즈.', 'THE MAKERS — “The people who make the future.”'),
]

// skills.html (허브) + skills-<area>.html (그리드).
export const SKILL_AREAS: SkillArea[] = [
  {
    key: 'pm',
    label: copy('PM', 'PM'),
    blurb: copy('경영 · 관리 · 의사결정 — 원가 제1원칙, 커리어 임팩트 보드, Notion OS, 창고물류 SCM, 결정 시스템.', 'Business, management, and decisions — cost first principles, career impact, Notion OS, warehouse SCM, and decision systems.'),
    cards: [
      card('instrument-rack', '원가 제1원칙 해부 보드', 'Cost First-Principles Board', '원가', 'Cost', 'OPEX First-Principles Ledger — 원가를 분해·측정·절감.', 'OPEX First-Principles Ledger — break down, measure, and reduce cost.'),
      card('gantt-cpm', '커리어 간트 · 임팩트 보드', 'Career Gantt · Impact Board', 'PM', 'PM', '간트 + 크리티컬 패스 + 스코어카드 — 프로젝트 임팩트 보드.', 'Gantt + critical path + scorecard — a project impact board.'),
      card('pipeline-dag', 'Notion OS · DAG', 'Notion OS · DAG', '운영 OS', 'Operating OS', 'Org Operating System — 조직 운영을 노드 그래프(DAG)로.', 'An organizational operating system modeled as a node graph (DAG).'),
      card('scada-hmi', '창고물류 SCM HMI', 'Warehouse SCM HMI', '물류·SCM', 'Logistics · SCM', '창고물류 이관 개선 TF — 재고·물류 SCADA/HMI. 재고회전율 +17%.', 'Warehouse-transfer improvement task force — inventory and logistics SCADA/HMI. Inventory turnover +17%.'),
      card('decision-os', 'Decision OS', 'Decision OS', '의사결정', 'Decision-making', '가치 변위 콘솔 — 결정론적 Gate→Score→Cap·append-only Ledger.', 'A value-displacement console — deterministic Gate→Score→Cap with an append-only ledger.'),
    ],
  },
  {
    key: 'process',
    label: copy('공정', 'Process'),
    blurb: copy('제조 · 계측 · 로보틱스 — 용접/적층/측정/로봇 교시와 디지털 트윈.', 'Manufacturing, metrology, and robotics — welding, additive manufacturing, measurement, robot teaching, and digital twins.'),
    cards: [
      card('sonar-waterfall', '초음파 용착 DOE', 'Ultrasonic Welding DOE', '공정', 'Process', '조건 최적화 반응면 — 용착 파라미터 DOE 워터폴.', 'An optimization response surface — a waterfall view of welding-parameter DOE.'),
      card('weld-thermal', 'Nd:YAG 레이저 용접기', 'Nd:YAG Laser Welder', '용접', 'Welding', '1064nm 펄스 — 레이저가 경로를 그리며 키홀/심/패턴 용접.', '1064 nm pulses — a laser traces paths for keyhole, seam, and pattern welding.'),
      card('oscilloscope', '스팟 용접 전류 파형', 'Spot-welding Current Waveform', '계측', 'Metrology', '2차 전류 모니터 — AC/MFDC 파형, 라이브 오실로스코프 + 전류 모니터.', 'Secondary-current monitor — AC/MFDC waveforms with a live oscilloscope.'),
      card('robot-pendant', '티칭 펜던트 · 스팟용접', 'Teaching Pendant · Spot Welding', '로보틱스', 'Robotics', 'PROG[SPOT_WLD] 교시 — 로봇 스팟 용접 티칭 펜던트.', 'PROG[SPOT_WLD] teaching — a pendant for robot spot-welding programming.'),
      card('gcode-printer', '적층제조 치공구 빌드', 'Additive-manufacturing Jig Build', '적층제조', 'Additive manufacturing', 'Jig 직접 제작 — FDM 빌드 + 슬라이싱 파라미터.', 'Direct jig manufacturing — FDM build and slicing parameters.'),
      card('cmm-metrology', 'CMM 정밀 측정', 'CMM Precision Measurement', '계측', 'Metrology', '3D 좌표측정 — 프로브 시퀀스·GD&T·검사성적서 자동발행.', '3D coordinate measurement — probe sequences, GD&T, and automated inspection reports.'),
      card('digital-twin', '디지털 트윈', 'Digital Twin', '제조·3D', 'Manufacturing · 3D', '연결된 도메인 = 조직·공정의 디지털 트윈.', 'Connected domains form a digital twin of the organization and process.'),
    ],
  },
  {
    key: 'dev',
    label: copy('개발', 'Development'),
    blurb: copy('소프트웨어 · 데이터 — 도면·DB·MES·IDE로 보는 시스템 설계.', 'Software and data — system design seen through drawings, databases, MES, and IDEs.'),
    cards: [
      card('pid-scheme', 'P&ID 시스템 토폴로지', 'P&ID System Topology', '아키텍처', 'Architecture', 'ISA-5.1 — 소프트웨어 아키텍처를 P&ID 도면으로.', 'ISA-5.1 — software architecture represented as a P&ID drawing.'),
      card('db-architecture', 'DB 모델링 / 데이터 아키텍처', 'DB Modeling / Data Architecture', '데이터·DB', 'Data · DB', '엑셀 파편화 → 정규화 관계형 DB(26테이블 ERD).', 'Fragmented spreadsheets → normalized relational DB (26-table ERD).'),
      card('mes-console', 'MES 실시간 운영 콘솔', 'MES Real-time Operations Console', '데이터', 'Data', '현장 운영 시스템 — MES/BI 실시간 콘솔.', 'A field-operations system — real-time MES/BI console.'),
      card('ide-coding', 'IDE 코딩 화면', 'IDE Coding Screen', '개발', 'Development', '라이브 타이핑 + 터미널 테스트(pnpm test → 6 passed) — 개발자의 코드 에디터.', 'Live typing + terminal tests (pnpm test → 6 passed) — a developer’s code editor.'),
    ],
  },
  {
    key: 'infra',
    label: copy('인프라', 'Infrastructure'),
    blurb: copy('시스템 · 관제 — 작업 관제와 에이전트 거버넌스.', 'Systems and control — work operations control and agent governance.'),
    cards: [
      card('radar-sonar', 'Work Radar 관제 콕핏', 'Work Radar Control Cockpit', '관제', 'Operations control', 'PPI 스코프 — 작업 신호를 무한 재취득하는 관제 레이더.', 'A PPI scope — operations radar that continuously reacquires work signals.'),
      card('agent-governance', 'AI 에이전트 거버넌스', 'AI Agent Governance', '거버넌스', 'Governance', 'Boule Control Room — 에이전트 자율성·권한·감사 관제.', 'Boule Control Room — control over agent autonomy, authority, and auditability.'),
    ],
  },
  {
    key: 'pkm',
    label: copy('PKM', 'PKM'),
    blurb: copy('지식관리 — 볼트 의미지도와 Hermes 지식 컨트롤 플레인.', 'Knowledge management — a vault semantic map and the Hermes knowledge control plane.'),
    cards: [
      card('ai-latent', '볼트 의미지도', 'Vault Semantic Map', 'PKM', 'PKM', 'BGE-M3 지식그래프 — 캡션 전환마다 크로스도메인 연결이 재형성. 테크스택·철학을 한 그래프로.', 'BGE-M3 knowledge graph — cross-domain links reform with each caption; tech stack and philosophy in one graph.'),
      card('graphrag', 'Hermes 컨트롤 플레인', 'Hermes Control Plane', '지식 플랫폼', 'Knowledge platform', 'OKF 정본 · Graphiti 은닉 temporal index · Hermes MCP 단일 진입점 · PR write 게이트.', 'OKF source of truth · Graphiti hidden temporal index · Hermes MCP single entry point · PR write gate.'),
    ],
  },
]

// 허브/스킬 페이지 헤더 (skills.html). label 라인은 .al 텍스트.
export const SKILLS_HUB = {
  title: copy('Skills · 영역별 실작업', 'Skills · Hands-on Work by Area'),
  sub: copy('실제로 만든 시안 20종을 5개 영역으로 나눴습니다. 각 영역 페이지는 해당 시안만 지연로딩하여 가볍게 열립니다.', 'Twenty hands-on pieces grouped into five areas. Each area page lazy-loads only its own pieces for a lightweight experience.'),
}

// 영역별 헤더 (skills-<area>.html) + 허브 카드 라벨 라인(.al).
export const AREA_META: Record<SkillAreaKey, { heading: LocalizedString; sub: LocalizedString; labelLine: LocalizedString }> = {
  pm: {
    heading: copy('PM · 경영 · 관리 · 의사결정', 'PM · Business · Management · Decisions'),
    sub: copy('원가를 제1원칙으로 분해하고, 프로젝트 임팩트를 보드로, 결정을 시스템으로 — 운영을 OS로.', 'Break down cost from first principles, put project impact on a board, and turn decisions into a system — an operating OS.'),
    labelLine: copy('원가 · 간트 · Notion OS · 창고물류 SCM · Decision OS', 'Cost · Gantt · Notion OS · Warehouse SCM · Decision OS'),
  },
  process: {
    heading: copy('공정 · 제조 · 계측 · 로보틱스', 'Process · Manufacturing · Metrology · Robotics'),
    sub: copy('용접·적층·측정·로봇 교시와 디지털 트윈 — 현장 기술을 인터랙티브 계측으로.', 'Welding, additive manufacturing, measurement, robot teaching, and digital twins — hands-on engineering as interactive metrology.'),
    labelLine: copy('DOE · 레이저 · 전류 · 로봇 · 적층 · CMM · 트윈', 'DOE · Laser · Current · Robot · Additive · CMM · Twin'),
  },
  dev: {
    heading: copy('개발 · 소프트웨어 · 데이터', 'Development · Software · Data'),
    sub: copy('도면·DB·MES·IDE — 시스템을 설계하고 데이터를 구조화한 결과물.', 'Drawings, databases, MES, and IDEs — work that designs systems and structures data.'),
    labelLine: copy('P&ID · DB · MES · IDE', 'P&ID · DB · MES · IDE'),
  },
  infra: {
    heading: copy('인프라 · 시스템 · 관제', 'Infrastructure · Systems · Operations Control'),
    sub: copy('관제·거버넌스 — 시스템을 운영·통제하는 레이어.', 'Operations control and governance — the layer that runs and governs systems.'),
    labelLine: copy('Work Radar · 거버넌스', 'Work Radar · Governance'),
  },
  pkm: {
    heading: copy('PKM · 지식관리', 'PKM · Knowledge Management'),
    sub: copy('지식을 흘려보내지 않고 구조로 — 볼트 의미지도와 Hermes 지식 컨트롤 플레인.', 'Keep knowledge from leaking away by turning it into structure — a vault semantic map and the Hermes knowledge control plane.'),
    labelLine: copy('볼트 의미지도 · Hermes', 'Vault Semantic Map · Hermes'),
  },
}
