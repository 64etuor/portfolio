// 27 시안 레지스트리. 각 시안은 public/lab 의 self-contained HTML.
// owns = 이 시안이 단독 소유하는 핵심 지표(중복 제거 기준).
// bg = 배경 톤 매칭용 hex.

export interface Scene {
  id: string // "01"
  slug: string
  file: string
  title: string
  domain: string
  perspective: string
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
  { id: '03', slug: 'pipeline-dag', file: 'pipeline-dag.html', title: 'Notion OS — 조직 운영 시스템', domain: '프로젝트', perspective: 'project-career', cluster: 'project', bg: '#0c0e12', featured: true, blurb: '회의→결정→OKR→백로그→PRD→Runbook을 잇는 조직 운영 OS.' },
  { id: '13', slug: 'radar-sonar', file: 'radar-sonar.html', title: 'Work Radar — AI 워크플로우 콕핏', domain: '프로젝트', perspective: 'project-career', cluster: 'project', bg: '#060a08', featured: true, blurb: 'local-first AI 콕핏 11 서피스. 신호 수집·시간 배치·agent 거버넌스.' },

  // 프로젝트 + 경력 — 경력(제조 3社)
  { id: '20', slug: 'instrument-rack', file: 'instrument-rack.html', title: '생산관리 · 원가 제1원칙', domain: '제조·원가', perspective: 'project-career', cluster: 'career', bg: '#0b0d0f', owns: '운영경비 −85%', blurb: '배터리팩 생산관리. 운영경비 −85%·불량 0건의 단독 무대.' },
  { id: '18', slug: 'sonar-waterfall', file: 'sonar-waterfall.html', title: '초음파 용착 DOE', domain: '제조·용착', perspective: 'project-career', cluster: 'career', bg: '#060a10', owns: '용착 15%→0%', blurb: '스팟·레이저·초음파 용착 DOE. 용착 15%→0%의 단독 무대.' },
  { id: '15', slug: 'scada-hmi', file: 'scada-hmi.html', title: 'SCM · 재고 최적화', domain: '물류·SCM', perspective: 'project-career', cluster: 'career', bg: '#0e1217', owns: '재고회전율 +17%', blurb: '창고물류 SCM 개선. 재고회전율 +17%의 단독 무대.' },
  { id: '17', slug: 'gantt-cpm', file: 'gantt-cpm.html', title: '커리어 타임라인 — 경력 + 프로젝트', domain: '경력 종합', perspective: 'project-career', cluster: 'career', bg: '#0c0f14', featured: true, owns: '사무공수 −451분 · ST −50%', blurb: '회사 5社를 크리티컬 패스로, 자기주도 프로젝트 16건을 병렬로 묶은 커리어 간트·임팩트 보드.' },
  { id: '01', slug: 'mes-console', file: 'mes-console.html', title: 'MES 구축', domain: '제조·MES', perspective: 'project-career', cluster: 'career', bg: '#0a0a0c', featured: true, blurb: '신제품 라인 MES 자체 개발·운영 체계 구축.' },
  { id: '12', slug: 'cmm-metrology', file: 'cmm-metrology.html', title: 'CMM 정밀 측정 · GD&T 검사', domain: '계측·CMM', perspective: 'project-career', cluster: 'career', bg: '#0a0e14', owns: 'GD&T 검사성적서', blurb: 'CMM 3D 좌표측정·GD&T 검사성적서 자동발행.' },

  // 스킬
  { id: '11', slug: 'weld-thermal', file: 'weld-thermal.html', title: '산업 용접 기술', domain: '공정기술', perspective: 'skill', bg: '#0a0410', blurb: '스팟·레이저 용접 공정 기술과 조건 설계.' },
  { id: '16', slug: 'robot-pendant', file: 'robot-pendant.html', title: '설비·로봇 티칭', domain: '설비', perspective: 'skill', bg: '#0c0e12', blurb: '설비 기술·로봇 티칭·레시피(작업 프로그램) 설계.' },
  { id: '19', slug: 'pid-scheme', file: 'pid-scheme.html', title: '시스템 토폴로지', domain: '아키텍처', perspective: 'skill', bg: '#0c0f14', blurb: 'ISA-5.1 도면 언어로 그린 시스템 토폴로지/아키텍처.' },
  { id: '22', slug: 'db-architecture', file: 'db-architecture.html', title: 'DB 모델링', domain: '데이터·DB', perspective: 'skill', bg: '#0c0f14', featured: true, blurb: '유명·장대한 DB 스키마 예제로 보는 데이터 모델링 역량.' },

  // 철학
  { id: '06', slug: 'digital-twin', file: 'digital-twin.html', title: '도메인 지식의 미래 유용성', domain: '크로스도메인', perspective: 'philosophy', bg: '#0b0b0d', featured: true, blurb: '제조+개발+AI 이해도 — 다가올 시대에 크로스도메인이 갖는 가치.' },
  { id: '09', slug: 'oscilloscope', file: 'oscilloscope.html', title: '품질에 철저한 성격', domain: '품질', perspective: 'philosophy', bg: '#0a0e0c', blurb: '스팟 용접 검사 — 품질과 타협하지 않는 검사 기준.' },

  // 지식관리
  { id: '04', slug: 'ai-latent', file: 'ai-latent.html', title: '볼트 semantic map', domain: '지식·AI', perspective: 'knowledge', bg: '#07080d', blurb: 'BGE-M3→UMAP→HDBSCAN 볼트 임베딩 의미맵. 그대로 유지.' },
  { id: '23', slug: 'agent-governance', file: 'agent-governance.html', title: 'Boule 거버넌스', domain: 'AI 거버넌스', perspective: 'knowledge', bg: '#0a0d0f', featured: true, blurb: '권한·중단조건·인간승인 경계가 먼저인 자동 개발 거버넌스.' },
  { id: '25', slug: 'decision-os', file: 'decision-os.html', title: 'Decision OS', domain: '의사결정', perspective: 'knowledge', bg: '#0a0d12', blurb: '결정론적 Gate→Score→Cap→Tiebreaker·append-only Ledger.' },
  { id: '26', slug: 'graphrag', file: 'graphrag.html', title: 'GraphRAG / 신경-기호', domain: 'AI', perspective: 'knowledge', bg: '#080a0f', blurb: 'Leiden 커뮤니티 그래프·벡터↔그래프 멀티홉.' },

  // 보류 (parked) — 홈/릴 제외, 콘텐츠 작업 안 함
  { id: '07', slug: 'gcode-printer', file: 'gcode-printer.html', title: 'G-code 3D 프린터 빌드', domain: '적층제조', perspective: 'project-career', cluster: 'project', status: 'parked', bg: '#0e1116', blurb: '하드웨어 개발 후보 — 보류.' },
]

export const sceneById = (id: string) => SCENES.find((s) => s.id === id || s.slug === id)
