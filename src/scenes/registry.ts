// 27 시안 레지스트리. 각 시안은 public/lab 의 self-contained HTML.
// perspective = 4관점(+진입) 그룹. owns = 이 시안이 단독 소유하는 핵심 지표(중복 제거 기준).
// bg = 배경 톤 매칭용 hex.

export interface Perspective {
  id: string
  n: string
  title: string
  blurb: string
}

export const PERSPECTIVES: Perspective[] = [
  { id: 'entry', n: '0', title: '진입', blurb: '부팅 = 커리어의 시작점. 단 한 번.' },
  { id: 'project-career', n: '1', title: '프로젝트 + 경력', blurb: '자기주도 제품과 제조 현장 경력 — 실제로 만들어 성과를 낸 것.' },
  { id: 'skill', n: '2', title: '스킬', blurb: '어떻게 만드는가 — 기술 역량 그 자체.' },
  { id: 'philosophy', n: '3', title: '철학', blurb: '왜 그렇게 일하는가 — 일하는 사고원칙.' },
  { id: 'knowledge', n: '4', title: '지식관리', blurb: '지식을 운영 시스템으로.' },
]

export interface Scene {
  id: string // "01"
  slug: string
  file: string
  title: string
  domain: string
  perspective: string // PERSPECTIVES.id
  cluster?: 'project' | 'career' // 'project-career' 관점 내 서브그룹
  status?: 'active' | 'parked' // 미지정 = active. parked는 홈/릴 제외
  bg: string
  featured?: boolean
  owns?: string // 단독 소유 핵심 지표 (없으면 지표 미보유 시안)
  blurb: string
}

export const SCENES: Scene[] = [
  // 진입
  { id: '05', slug: 'bios-boot', file: '05-bios-boot.html', title: 'BIOS / POST 부팅', domain: '펌웨어', perspective: 'entry', bg: '#050805', blurb: '시스템 부팅 = 커리어 시작점. 인트로 전용.' },

  // 프로젝트 + 경력 — 프로젝트(자기주도)
  { id: '03', slug: 'pipeline-dag', file: '03-pipeline-dag.html', title: 'Notion OS — 조직 운영 시스템', domain: '프로젝트', perspective: 'project-career', cluster: 'project', bg: '#0c0e12', featured: true, blurb: '회의→결정→OKR→백로그→PRD→Runbook을 잇는 조직 운영 OS.' },
  { id: '13', slug: 'radar-sonar', file: '13-radar-sonar.html', title: 'Work Radar — AI 워크플로우 콕핏', domain: '프로젝트', perspective: 'project-career', cluster: 'project', bg: '#060a08', featured: true, blurb: 'local-first AI 콕핏 11 서피스. 신호 수집·시간 배치·agent 거버넌스.' },

  // 프로젝트 + 경력 — 경력(제조 3社)
  { id: '20', slug: 'instrument-rack', file: '20-instrument-rack.html', title: '은성 — 생산관리·원가', domain: '경력·은성', perspective: 'project-career', cluster: 'career', bg: '#0b0d0f', owns: '운영경비 −85%', blurb: '배터리팩 생산관리. 운영경비 −85%·불량 0건의 단독 무대.' },
  { id: '02', slug: 'assembly-line', file: '02-assembly-line.html', title: '이랜텍 — 라인 생산성', domain: '경력·이랜텍', perspective: 'project-career', cluster: 'career', bg: '#0d0d0d', featured: true, owns: 'C/T −49% · 생산성 +24%', blurb: 'LOB·C/T 분석 기반 라인 개선. C/T −49%·생산성 +24%의 단독 무대.' },
  { id: '18', slug: 'sonar-waterfall', file: '18-sonar-waterfall.html', title: '이랜텍 — 초음파 용착 DOE', domain: '경력·이랜텍', perspective: 'project-career', cluster: 'career', bg: '#060a10', owns: '용착 15%→0%', blurb: '스팟·레이저·초음파 용착 DOE. 용착 15%→0%의 단독 무대.' },
  { id: '15', slug: 'scada-hmi', file: '15-scada-hmi.html', title: '이랜텍/삼성 — SCM·재고', domain: '경력·SCM', perspective: 'project-career', cluster: 'career', bg: '#0e1217', owns: '재고회전율 +17%', blurb: '삼성 상생아카데미 SCM 개선. 재고회전율 +17%의 단독 무대.' },
  { id: '17', slug: 'gantt-cpm', file: '17-gantt-cpm.html', title: '솔라엣지 — 공정 데이터 관리', domain: '경력·솔라엣지', perspective: 'project-career', cluster: 'career', bg: '#f5f3ee', featured: true, owns: '사무공수 −451분 · ST −50%', blurb: '데이터 통합 관리. 사무공수 −451분·ST −50%의 단독 무대.' },
  { id: '01', slug: 'mes-console', file: '01-mes-console.html', title: '솔라엣지 — MES 구축', domain: '경력·솔라엣지', perspective: 'project-career', cluster: 'career', bg: '#0a0a0c', featured: true, blurb: '신제품 라인 MES 자체 개발·운영 체계 구축.' },
  { id: '12', slug: 'cmm-metrology', file: '12-cmm-metrology.html', title: '솔라엣지 — 추적성·검사', domain: '경력·솔라엣지', perspective: 'project-career', cluster: 'career', bg: '#0a0e14', owns: 'S/N 추적성', blurb: 'S/N 추적성·검사성적서 자동발행. 추적성의 단독 무대.' },

  // 스킬
  { id: '11', slug: 'weld-thermal', file: '11-weld-thermal.html', title: '산업 용접 기술', domain: '공정기술', perspective: 'skill', bg: '#0a0410', blurb: '스팟·레이저 용접 공정 기술과 조건 설계.' },
  { id: '16', slug: 'robot-pendant', file: '16-robot-pendant.html', title: '설비·로봇 티칭', domain: '설비', perspective: 'skill', bg: '#0c0e12', blurb: '설비 기술·로봇 티칭·레시피(작업 프로그램) 설계.' },
  { id: '19', slug: 'pid-scheme', file: '19-pid-scheme.html', title: '시스템 토폴로지', domain: '아키텍처', perspective: 'skill', bg: '#0c0f14', blurb: 'ISA-5.1 도면 언어로 그린 시스템 토폴로지/아키텍처.' },
  { id: '22', slug: 'db-architecture', file: '22-db-architecture.html', title: 'DB 모델링', domain: '데이터·DB', perspective: 'skill', bg: '#0c0f14', featured: true, blurb: '유명·장대한 DB 스키마 예제로 보는 데이터 모델링 역량.' },

  // 철학
  { id: '06', slug: 'digital-twin', file: '06-digital-twin.html', title: '도메인 지식의 미래 유용성', domain: '크로스도메인', perspective: 'philosophy', bg: '#0b0b0d', featured: true, blurb: '제조+개발+AI 이해도 — 다가올 시대에 크로스도메인이 갖는 가치.' },
  { id: '08', slug: 'living-spreadsheet', file: '08-living-spreadsheet.html', title: '코딩의 기원', domain: '크로스도메인', perspective: 'philosophy', bg: '#e9eef0', blurb: '엑셀 자동화에서 시작된 코딩 — 현장에서 도구로 건너간 길.' },
  { id: '09', slug: 'oscilloscope', file: '09-oscilloscope.html', title: '품질에 철저한 성격', domain: '품질', perspective: 'philosophy', bg: '#0a0e0c', blurb: '스팟 용접 검사 — 품질과 타협하지 않는 검사 기준.' },
  { id: '24', slug: 'delegation-cost', file: '24-delegation-cost.html', title: '위임 = 비용 이동', domain: '사상', perspective: 'philosophy', bg: '#0c0d10', blurb: '"위임은 비용을 옮길 뿐" — 하네스 사고(포카요케).' },

  // 지식관리
  { id: '04', slug: 'ai-latent', file: '04-ai-latent.html', title: '볼트 semantic map', domain: '지식·AI', perspective: 'knowledge', bg: '#07080d', blurb: 'BGE-M3→UMAP→HDBSCAN 볼트 임베딩 의미맵. 그대로 유지.' },
  { id: '23', slug: 'agent-governance', file: '23-agent-governance.html', title: 'Boule 거버넌스', domain: 'AI 거버넌스', perspective: 'knowledge', bg: '#0a0d0f', featured: true, blurb: '권한·중단조건·인간승인 경계가 먼저인 자동 개발 거버넌스.' },
  { id: '25', slug: 'decision-os', file: '25-decision-os.html', title: 'Decision OS', domain: '의사결정', perspective: 'knowledge', bg: '#0a0d12', blurb: '결정론적 Gate→Score→Cap→Tiebreaker·append-only Ledger.' },
  { id: '26', slug: 'graphrag', file: '26-graphrag.html', title: 'GraphRAG / 신경-기호', domain: 'AI', perspective: 'knowledge', bg: '#080a0f', blurb: 'Leiden 커뮤니티 그래프·벡터↔그래프 멀티홉.' },

  // 보류 (parked) — 홈/릴 제외, 콘텐츠 작업 안 함
  { id: '07', slug: 'gcode-printer', file: '07-gcode-printer.html', title: 'G-code 3D 프린터 빌드', domain: '적층제조', perspective: 'project-career', cluster: 'project', status: 'parked', bg: '#0e1116', blurb: '하드웨어 개발 후보 — 보류.' },
  { id: '10', slug: 'pcb-board', file: '10-pcb-board.html', title: 'PCB 회로기판', domain: '하드웨어', perspective: 'project-career', cluster: 'project', status: 'parked', bg: '#07140d', blurb: '하드웨어 개발 후보 — 보류.' },
  { id: '14', slug: 'fluid-power', file: '14-fluid-power.html', title: '유압 / 공압 회로도', domain: '설비', perspective: 'skill', status: 'parked', bg: '#0a1426', blurb: '추후 제거 예정 — 보류.' },
  { id: '21', slug: 'windtunnel-cfd', file: '21-windtunnel-cfd.html', title: '풍동 / CFD 유동해석', domain: '기구설계', perspective: 'skill', status: 'parked', bg: '#07101c', blurb: '쓸 곳 미정 — 보류.' },
  { id: '27', slug: 'writer-philosophy', file: '27-writer-philosophy.html', title: '(구) 작가', domain: '인문', perspective: 'philosophy', status: 'parked', bg: '#f1ede3', blurb: '폐기 예정 — 보류.' },
]

export const sceneById = (id: string) => SCENES.find((s) => s.id === id || s.slug === id)
export const activeScenes = () => SCENES.filter((s) => s.status !== 'parked')
export const featuredScenes = () => activeScenes().filter((s) => s.featured)
export const scenesByPerspective = (pid: string) =>
  activeScenes().filter((s) => s.perspective === pid)
export const scenesByCluster = (pid: string, cluster: 'project' | 'career') =>
  scenesByPerspective(pid).filter((s) => s.cluster === cluster)
