// 27 시안 레지스트리. 각 시안은 public/lab 의 self-contained HTML.
// section = 서사 5막(+진입/피날레) 그룹. owns = 이 시안이 단독 소유하는 핵심 지표(중복 제거 기준).
// bg = 배경 톤 매칭용 hex.

export interface SceneSection {
  id: string
  n: string
  title: string
  blurb: string
}

export const SECTIONS: SceneSection[] = [
  { id: 'identity', n: '0', title: '정체성 / 진입', blurb: '서사 한 문장과 8개 지표를 — 단 한 번.' },
  { id: 'manufacturing', n: '1', title: '제조 현장 증거', blurb: '현장의 불합리를 측정 가능한 변항으로.' },
  { id: 'data', n: '2', title: '데이터 / SSOT', blurb: '변항을 신뢰 가능한 진실로 수렴.' },
  { id: 'ops', n: '3', title: '운영 / 제품 시스템', blurb: '수렴된 진실로 운영하고 제품화.' },
  { id: 'ai', n: '4', title: 'AI / 거버넌스', blurb: '경계를 설계해 자율을 확장.' },
  { id: 'human', n: '5', title: '사람 / 사상', blurb: '그 모든 동작의 근원.' },
]

export interface Scene {
  id: string // "01"
  slug: string
  file: string
  title: string
  domain: string
  section: string // SECTIONS.id
  bg: string
  featured?: boolean
  owns?: string // 단독 소유 핵심 지표 (없으면 지표 미보유 시안)
  blurb: string
}

export const SCENES: Scene[] = [
  { id: '05', slug: 'bios-boot', file: '05-bios-boot.html', title: 'BIOS / POST 부팅', domain: '펌웨어', section: 'identity', bg: '#050805', blurb: '시스템 부팅 = 커리어 시작점(스마트팩토리 도입). CRT 터미널 이력서.' },
  { id: '04', slug: 'ai-latent', file: '04-ai-latent.html', title: 'AI 잠재공간 (semantic_map)', domain: 'AI', section: 'identity', bg: '#07080d', blurb: 'BGE-M3→UMAP→HDBSCAN 실제 볼트 임베딩·의미=사용·vector↔symbol.' },

  { id: '02', slug: 'assembly-line', file: '02-assembly-line.html', title: '공정 라인 / Assembly Line', domain: '제조', section: 'manufacturing', bg: '#0d0d0d', featured: true, owns: '공정 C/T 31~49%', blurb: '라인 흐름·병목 개선. 공정 C/T 단축의 단독 무대.' },
  { id: '11', slug: 'weld-thermal', file: '11-weld-thermal.html', title: '용접 아크 / 열화상', domain: '제조·품질', section: 'manufacturing', bg: '#0a0410', featured: true, owns: '용착 불량 15%→0% (DOE)', blurb: 'iron LUT 열화상·결함→DOE→균일비드. 용착 15%→0%의 단독 무대.' },
  { id: '09', slug: 'oscilloscope', file: '09-oscilloscope.html', title: '오실로스코프 / 제어', domain: '계측·제어', section: 'manufacturing', bg: '#0a0e0c', owns: '제품 ST −50%', blurb: 'CH1–4 파형·PID 스텝응답. 시간축 단축(ST −50%)의 단독 무대.' },
  { id: '12', slug: 'cmm-metrology', file: '12-cmm-metrology.html', title: '3D 측정기 / CMM', domain: '품질', section: 'manufacturing', bg: '#0a0e14', featured: true, owns: '불량·추적성 0건 (Core Value Award)', blurb: 'CMM·GD&T·검사성적서·S/N 추적성·품질 신념. 불량 0건의 단독 무대.' },
  { id: '16', slug: 'robot-pendant', file: '16-robot-pendant.html', title: '로봇 티칭 펜던트', domain: '로보틱스', section: 'manufacturing', bg: '#0c0e12', blurb: '유휴 설비 재활용·비전 검사 자산화 + 하네스 엔지니어링(제약→자율).' },
  { id: '07', slug: 'gcode-printer', file: '07-gcode-printer.html', title: 'G-code 3D 프린터 빌드', domain: '적층제조', section: 'manufacturing', bg: '#0e1116', blurb: '키오스크 프로토타입 기구 제작·적층/재제작 (메이커 면).' },

  { id: '22', slug: 'db-architecture', file: '22-db-architecture.html', title: 'DB 모델링 & 데이터 아키텍처', domain: '데이터·DB', section: 'data', bg: '#0c0f14', featured: true, blurb: '공정데이터관리·KH 16엔티티·볼트 스키마·SSOT Outbox+CDC. (수렴의 본진)' },
  { id: '19', slug: 'pid-scheme', file: '19-pid-scheme.html', title: 'P&ID 풀스킴 (데이터 플로우)', domain: '공정도·데이터', section: 'data', bg: '#eef0e8', featured: true, blurb: 'ISA-5.1 도면으로 그린 3-시스템 통합 토폴로지.' },
  { id: '08', slug: 'living-spreadsheet', file: '08-living-spreadsheet.html', title: '살아있는 스프레드시트', domain: '데이터·메타', section: 'data', bg: '#e9eef0', owns: '사무공수 −451분/일 (연 5천만)', blurb: '엑셀/VBA/RPA→DB. 451행→1쿼리. 사무 자동화의 단독 무대.' },
  { id: '03', slug: 'pipeline-dag', file: '03-pipeline-dag.html', title: '데이터 파이프라인 DAG', domain: '개발', section: 'data', bg: '#0c0e12', blurb: 'DV 데이터(2408) 수기→추적 가능한 파이프라인 전환.' },
  { id: '18', slug: 'sonar-waterfall', file: '18-sonar-waterfall.html', title: '소나 워터폴 / 스펙트로그램', domain: '신호·데이터', section: 'data', bg: '#060a10', blurb: 'Mirrorless·Work Radar 실시간 신호 4채널 스트리밍.' },
  { id: '20', slug: 'instrument-rack', file: '20-instrument-rack.html', title: '디지털 멀티미터 / 계측 랙', domain: '계측', section: 'data', bg: '#0b0d0f', owns: 'OPEX −85%', blurb: '관찰성 5층·캘리브레이션. 원가·운영 계측값(OPEX −85%)의 단독 무대.' },
  { id: '10', slug: 'pcb-board', file: '10-pcb-board.html', title: 'PCB 회로기판', domain: '하드웨어', section: 'data', bg: '#07140d', blurb: '키오스크 전자 + 제조×SW 서명(Bitmask/RAND/SQLSTATE/WITH RECURSIVE).' },

  { id: '01', slug: 'mes-console', file: '01-mes-console.html', title: 'MES 실시간 운영 콘솔', domain: '데이터·운영', section: 'ops', bg: '#0a0a0c', featured: true, blurb: '신제품 라인 MES 자체개발 운영 콘솔 + 지도카/안돈 철학. (운영의 관문)' },
  { id: '15', slug: 'scada-hmi', file: '15-scada-hmi.html', title: 'SCADA HMI 패널', domain: '감시제어', section: 'ops', bg: '#0e1217', owns: '재고회전율 +17% (삼성물류)', blurb: '재고·흐름 트렌드/알람 + 지식 볼트 운영 OS. 재고회전율의 단독 무대.' },
  { id: '17', slug: 'gantt-cpm', file: '17-gantt-cpm.html', title: '간트 + 크리티컬 패스 + 스코어카드', domain: '경영·PM', section: 'ops', bg: '#f5f3ee', featured: true, owns: '생산성 +24% (LOB)', blurb: 'WBS·LOB·일정/자원 + 자기운영(Momentum·Life Wheel). 생산성의 단독 무대.' },
  { id: '06', slug: 'digital-twin', file: '06-digital-twin.html', title: '디지털 트윈 3D 공장', domain: '제품·3D', section: 'ops', bg: '#0b0b0d', featured: true, blurb: 'Mirrorless/Beautifly 미용실 운영 플랫폼 + local-first 동기화.' },
  { id: '13', slug: 'radar-sonar', file: '13-radar-sonar.html', title: '레이더 / 소나 PPI', domain: '탐지·사업', section: 'ops', bg: '#060a08', blurb: 'KH Project 시장·세그먼트 탐지 + insane-search 적응형 접근.' },
  { id: '21', slug: 'windtunnel-cfd', file: '21-windtunnel-cfd.html', title: '풍동 / CFD 유동해석', domain: '기구설계', section: 'ops', bg: '#07101c', blurb: 'CadQuery 키오스크 냉각 유동(전환/비주얼 — 실 CFD 프로젝트 아님).' },

  { id: '23', slug: 'agent-governance', file: '23-agent-governance.html', title: 'AI 에이전트 거버넌스 / Boule', domain: 'AI', section: 'ai', bg: '#0a0d0f', featured: true, blurb: 'Work Radar Boule: 실행보다 권한·중단조건·인간승인 경계가 먼저.' },
  { id: '25', slug: 'decision-os', file: '25-decision-os.html', title: '의사결정 트리 / Decision OS', domain: '의사결정', section: 'ai', bg: '#0a0d12', blurb: '가치 변위·결정론적 Gate→Score→Cap→Tiebreaker·append-only Ledger.' },
  { id: '26', slug: 'graphrag', file: '26-graphrag.html', title: 'GraphRAG / 신경-기호', domain: 'AI', section: 'ai', bg: '#080a0f', blurb: 'Leiden 커뮤니티 그래프·벡터↔그래프 멀티홉·검증가능성×설명가능성.' },
  { id: '24', slug: 'delegation-cost', file: '24-delegation-cost.html', title: '위임 통화 환산기', domain: 'AI·사상', section: 'ai', bg: '#0c0d10', blurb: '"위임은 비용을 옮길 뿐" 인터랙티브 도구·5기둥 하네스.' },
  { id: '14', slug: 'fluid-power', file: '14-fluid-power.html', title: '유압 / 공압 회로도', domain: '설비·시스템', section: 'ai', bg: '#0a1426', blurb: '멱등성/재시도(체크밸브=멱등키) — 재시도 안전 시스템 사고.' },

  { id: '27', slug: 'writer-philosophy', file: '27-writer-philosophy.html', title: '거울 라이브러리 — 작가이자 사상가', domain: '인문', section: 'human', bg: '#f1ede3', featured: true, blurb: '시·에세이 + 철학 4렌즈 + 신념 3원칙. 그 모든 동작의 근원.' },
]

export const sceneById = (id: string) => SCENES.find((s) => s.id === id || s.slug === id)
export const featuredScenes = () => SCENES.filter((s) => s.featured)
export const scenesBySection = (sectionId: string) => SCENES.filter((s) => s.section === sectionId)
