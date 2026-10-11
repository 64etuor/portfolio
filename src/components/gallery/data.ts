// 갤러리 정본 데이터 — /scenes(필름 서사) + /skills(영역별 실작업) 카드. KO/EN 병기.
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
  card('36-bridge-experts', 'SCENE 09 · 해결 — THE BRIDGE', 'SCENE 09 · Solution — THE BRIDGE', 'Scene 09', 'Scene 09', '제조↔디지털을 한 사람이 양방향으로 잇는 양손잡이 전문가. 필름에선 Work Radar·KIP 작업 장면이 근거로 이어진다.', 'A cross-functional expert connecting manufacturing and digital work in both directions. In the film, Work Radar and KIP follow as evidence.'),
  card('37-cross-domain', 'SCENE 10 · 핵심 — CROSS-DOMAIN', 'SCENE 10 · Core — CROSS-DOMAIN', 'Scene 10', 'Scene 10', '경계를 넘는 지식의 교집합이 경쟁력으로 점화. 필름에선 스마트 팩토리·엑셀→DB·MES 작업 장면이 이어진다.', 'The intersection of knowledge across boundaries ignites competitive advantage. In the film, the smart factory, Excel → DB, and MES scenes follow.'),
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
    blurb: copy('제조 · 품질 · 로보틱스 — 용착 DOE, 용접, 비전 검사, 로봇 교시, 적층, 스마트 팩토리, 라인 밸런싱.', 'Manufacturing, quality, and robotics — welding DOE, welding, vision inspection, robot teaching, additive manufacturing, smart factory, and line balancing.'),
    cards: [
      card('x-weld-doe', '초음파 용착 DOE', 'Ultrasonic Welding DOE', '용착', 'Welding', '진폭·가압력·시간 DOE로 최적 조건을 찾아 용착 불량률 15% → 0%대. 재작업·폐기 비용 연 6,800만원 절감.', 'A DOE over amplitude, pressure, and weld time found the optimal window: weld defects 15% → ~0%, saving ₩68M a year in rework and scrap.'),
      card('weld-thermal', 'Nd:YAG 레이저 용접기', 'Nd:YAG Laser Welder', '용접', 'Welding', '1064nm 펄스 — 레이저가 경로를 그리며 키홀/심/패턴 용접.', '1064 nm pulses — a laser traces paths for keyhole, seam, and pattern welding.'),
      card('robot-pendant', '티칭 펜던트 · 스팟용접', 'Teaching Pendant · Spot Welding', '로보틱스', 'Robotics', 'PROG[SPOT_WLD] 교시 — 로봇 스팟 용접 티칭 펜던트.', 'PROG[SPOT_WLD] teaching — a pendant for robot spot-welding programming.'),
      card('gcode-printer', '적층제조 치공구 빌드', 'Additive-manufacturing Jig Build', '적층제조', 'Additive manufacturing', 'Jig 직접 제작 — FDM 빌드 + 슬라이싱 파라미터.', 'Direct jig manufacturing — FDM build and slicing parameters.'),
      card('x-vision-reverse', '비전 검사 · 셀 역삽 검출', 'Vision Inspection · Reversed Cells', '검사', 'Inspection', '배터리 모듈 셀 극성 역삽을 비전으로 검출. 이랜텍에선 유휴 비전 장비 4대를 재활용해 약 400만원 절감.', 'Vision check for reversed cell polarity in battery modules. At Elentec, four idle vision machines were reused (≈ ₩4M saved).'),
      card('x-smart-factory', '스마트 팩토리 도입', 'Smart Factory Adoption', '스마트팩토리', 'Smart factory', '은성(2021.08–2022.01) — 과제 신청·PM·요구사항 수립. Ecount ERP·바코드·태블릿 생산현황으로 수기 기록을 대체.', 'Eunsung (2021.08–2022.01) — applied for the program, ran it as PM, wrote the requirements. Ecount ERP, barcodes, and tablet status boards replaced paper logs.'),
      card('x-lob-balance', 'LOB 라인 밸런싱', 'LOB Line Balancing', '라인', 'Line', '병목 두 공정을 Jig로 단축(Neck C/T 16.72→12.76초, Function Test 55→28초). 라인 생산성 24% 향상.', 'Jigs cut the two bottlenecks (Neck C/T 16.72 → 12.76 s, function test 55 → 28 s). Line productivity +24%.'),
    ],
  },
  {
    key: 'dev',
    label: copy('개발', 'Development'),
    blurb: copy('소프트웨어 · 데이터 — 도면·DB·MES·엑셀 전환·추적성·IDE로 보는 시스템 설계.', 'Software and data — system design seen through drawings, databases, MES, Excel migration, traceability, and IDEs.'),
    cards: [
      card('pid-scheme', 'P&ID 시스템 토폴로지', 'P&ID System Topology', '아키텍처', 'Architecture', 'ISA-5.1 — 소프트웨어 아키텍처를 P&ID 도면으로.', 'ISA-5.1 — software architecture represented as a P&ID drawing.'),
      card('db-architecture', 'DB 모델링 / 데이터 아키텍처', 'DB Modeling / Data Architecture', '데이터·DB', 'Data · DB', '엑셀 파편화 → 정규화 관계형 DB(26테이블 ERD).', 'Fragmented spreadsheets → normalized relational DB (26-table ERD).'),
      card('x-mes-line', '신제품 라인 MES 자체 개발', 'New Line MES, Built In-house', 'MES', 'MES', '배터리 화재 방지용 글라스울 파우치 자동화 라인. 설비 예산에서 빠진 MES 외주비를 자체 개발로 대체 — PostgreSQL·Django·React, OPC UA 설비·비전 데이터 연동. 3개월 만에 프로토타입.', 'An automated line for glass-wool pouches (battery fire prevention). MES outsourcing was missing from the equipment budget, so I built it in-house — PostgreSQL, Django, React, wired to OPC UA equipment and vision data. Prototype in three months.'),
      card('x-excel-to-db', '엑셀 → DB 전환', 'Excel → Database', '데이터', 'Data', '담당자별 엑셀 8종을 DB로 통합하고 Power BI 대시보드로 자동 갱신. 사무 공수 하루 451분 감축.', 'Eight per-owner Excel files moved into one database with an auto-refreshing Power BI dashboard. Office work cut by 451 minutes a day.'),
      card('x-sn-trace', '공정 추적성 · S/N 관리', 'Process Traceability · S/N', '추적성', 'Traceability', '원자재 LOT → 조립 → 출하 S/N 계보 추적. 미등록 제품은 상위 공정 투입 차단. 2024 Core Value Award.', 'Genealogy from raw-material LOT through assembly to shipped S/N; unregistered units are blocked from later stations. 2024 Core Value Award.'),
      card('ide-coding', 'IDE 코딩 화면', 'IDE Coding Screen', '개발', 'Development', '라이브 타이핑 + 터미널 테스트(pnpm test → 6 passed) — 개발자의 코드 에디터.', 'Live typing + terminal tests (pnpm test → 6 passed) — a developer’s code editor.'),
    ],
  },
  {
    key: 'infra',
    label: copy('인프라', 'Infrastructure'),
    blurb: copy('시스템 · 운영 — 업무 신호 정리와 에이전트 거버넌스.', 'Systems and operations — sorting work signals and governing agents.'),
    cards: [
      card('x-work-radar-rails', 'Work Radar · 두 레일', 'Work Radar · Two Rails', '개인 프로젝트', 'Personal project', '일정·PR·백로그 신호는 자동 수집, 승격은 사람이 결정. 자동화(Codex job)는 샌드박스 제안 레일에서만 실행.', 'Calendar, PR, and backlog signals are collected automatically; a person decides what gets promoted. Automation (Codex jobs) runs only in a sandboxed proposal rail.'),
      card('agent-governance', 'AI 에이전트 거버넌스', 'AI Agent Governance', '거버넌스', 'Governance', 'Boule Control Room — 에이전트 자율성·권한·감사 통제.', 'Boule Control Room — control over agent autonomy, authority, and auditability.'),
    ],
  },
  {
    key: 'pkm',
    label: copy('PKM', 'PKM'),
    blurb: copy('지식관리 — 문서 근거 위치를 붙이는 KIP 검색.', 'Knowledge management — KIP search that attaches source locations to answers.'),
    cards: [
      card('x-kip-evidence', 'KIP · 근거 위치 검색', 'KIP · Search with Source Locations', '지식 검색', 'Knowledge search', 'HWP·PDF·PPTX·XLSX를 하나의 색인으로. 답변 문장마다 원문 위치(파일·페이지·블록)를 붙이고, 표는 별도 단위로 다룬다.', 'HWP, PDF, PPTX, and XLSX in one index. Every answer sentence carries its source location (file · page · block); tables stay separate units.'),
    ],
  },
]

// 허브/스킬 페이지 헤더 (skills.html). label 라인은 .al 텍스트.
export const SKILLS_HUB = {
  title: copy('Skills · 영역별 실작업', 'Skills · Hands-on Work by Area'),
  sub: copy('실제로 만든 시안 21종을 5개 영역으로 나눴습니다. 각 영역 페이지는 해당 시안만 지연로딩하여 가볍게 열립니다.', 'Twenty-one hands-on pieces grouped into five areas. Each area page lazy-loads only its own pieces for a lightweight experience.'),
}

// 영역별 헤더 (skills-<area>.html) + 허브 카드 라벨 라인(.al).
export const AREA_META: Record<SkillAreaKey, { heading: LocalizedString; sub: LocalizedString; labelLine: LocalizedString }> = {
  pm: {
    heading: copy('PM · 경영 · 관리 · 의사결정', 'PM · Business · Management · Decisions'),
    sub: copy('원가를 제1원칙으로 분해하고, 프로젝트 임팩트를 보드로, 결정을 시스템으로 — 운영을 OS로.', 'Break down cost from first principles, put project impact on a board, and turn decisions into a system — an operating OS.'),
    labelLine: copy('원가 · 간트 · Notion OS · 창고물류 SCM · Decision OS', 'Cost · Gantt · Notion OS · Warehouse SCM · Decision OS'),
  },
  process: {
    heading: copy('공정 · 제조 · 품질 · 로보틱스', 'Process · Manufacturing · Quality · Robotics'),
    sub: copy('용착 조건 최적화·용접·비전 검사·로봇 교시·적층·스마트 팩토리·라인 밸런싱 — 현장 개선 작업.', 'Weld-condition optimization, welding, vision inspection, robot teaching, additive manufacturing, smart factory, and line balancing — shop-floor improvement work.'),
    labelLine: copy('DOE · 레이저 · 비전 · 로봇 · 적층 · 스마트팩토리 · LOB', 'DOE · Laser · Vision · Robot · Additive · Smart factory · LOB'),
  },
  dev: {
    heading: copy('개발 · 소프트웨어 · 데이터', 'Development · Software · Data'),
    sub: copy('도면·DB·MES·엑셀 전환·추적성·IDE — 시스템을 설계하고 데이터를 구조화한 결과물.', 'Drawings, databases, MES, Excel migration, traceability, and IDEs — work that designs systems and structures data.'),
    labelLine: copy('P&ID · DB · MES · 엑셀→DB · S/N · IDE', 'P&ID · DB · MES · Excel→DB · S/N · IDE'),
  },
  infra: {
    heading: copy('인프라 · 시스템 · 운영', 'Infrastructure · Systems · Operations'),
    sub: copy('운영·거버넌스 — 시스템을 운영·통제하는 레이어.', 'Operations and governance — the layer that runs and governs systems.'),
    labelLine: copy('Work Radar · 거버넌스', 'Work Radar · Governance'),
  },
  pkm: {
    heading: copy('PKM · 지식관리', 'PKM · Knowledge Management'),
    sub: copy('문서 속 지식을 근거와 함께 꺼낸다 — 답변마다 원문 위치를 붙이는 KIP.', 'Pull knowledge out of documents with its evidence — KIP attaches the source location to every answer.'),
    labelLine: copy('KIP', 'KIP'),
  },
}
