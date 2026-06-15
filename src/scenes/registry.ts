// 27 시안 레지스트리. 각 시안은 public/lab 의 self-contained HTML.
// bg = 시안의 지배적 배경색(셸이 전환 시 배경 톤을 맞추는 데 사용).

export interface Scene {
  id: string // "01"
  slug: string
  file: string // public/lab/<file>
  title: string
  domain: string
  bg: string // 배경 톤 매칭용 hex
  featured?: boolean
  blurb: string
}

export const SCENES: Scene[] = [
  { id: '01', slug: 'mes-console', file: '01-mes-console.html', title: 'MES 실시간 운영 콘솔', domain: '데이터·운영', bg: '#0a0a0c', featured: true, blurb: 'OEE 게이지·KPI 카운트업·경력 Gantt·DOE 불량추세 + 지도카/안돈 운영철학' },
  { id: '02', slug: 'assembly-line', file: '02-assembly-line.html', title: '공정 라인 / Assembly Line', domain: '제조', bg: '#0d0d0d', blurb: '경력이 부품처럼 입고→가공→검사→조립→출하 스테이션 통과' },
  { id: '03', slug: 'pipeline-dag', file: '03-pipeline-dag.html', title: '데이터 파이프라인 DAG', domain: '개발', bg: '#0c0e12', blurb: 'Airflow식 노드 그래프·토큰 흐름·위상정렬 RUN·ML loss' },
  { id: '04', slug: 'ai-latent', file: '04-ai-latent.html', title: 'AI 잠재공간 (semantic_map)', domain: 'AI', bg: '#07080d', blurb: 'BGE-M3→UMAP→HDBSCAN 실제 볼트 임베딩·vector↔symbol·추론 콘솔' },
  { id: '05', slug: 'bios-boot', file: '05-bios-boot.html', title: 'BIOS / POST 부팅', domain: '펌웨어', bg: '#050805', blurb: '기계처럼 부팅 → CRT 터미널 이력서, DEFECT_RATE.SYS 15%→0% PATCHED' },
  { id: '06', slug: 'digital-twin', file: '06-digital-twin.html', title: '디지털 트윈 3D 공장', domain: '제조·3D', bg: '#0b0b0d', featured: true, blurb: '조작 가능한 아이소메트릭 플랜트·SCADA HUD + local-first 동기화' },
  { id: '07', slug: 'gcode-printer', file: '07-gcode-printer.html', title: 'G-code 3D 프린터 빌드', domain: '적층제조', bg: '#0e1116', blurb: '프로필이 레이어별 출력·G-code 스트림·용착 재출력 0%' },
  { id: '08', slug: 'living-spreadsheet', file: '08-living-spreadsheet.html', title: '살아있는 스프레드시트', domain: '데이터·메타', bg: '#e9eef0', blurb: '스스로 계산하는 이력서·수식바·재계산·451행→1쿼리 토글' },
  { id: '09', slug: 'oscilloscope', file: '09-oscilloscope.html', title: '오실로스코프 / 제어', domain: '계측·제어', bg: '#0a0e0c', blurb: 'CH1–4 라이브 파형·PID 스텝응답·FFT·리사주, DOE로 불량→0%' },
  { id: '10', slug: 'pcb-board', file: '10-pcb-board.html', title: 'PCB 회로기판', domain: '하드웨어', bg: '#07140d', blurb: 'U1–U4 IC·동박 트레이스·POWER ON + 제조×SW 서명(Bitmask/RECURSIVE)' },
  { id: '11', slug: 'weld-thermal', file: '11-weld-thermal.html', title: '용접 아크 / 열화상', domain: '제조·품질', bg: '#0a0410', blurb: 'iron LUT 열화상·아크 비드·FLIR HUD·결함→DOE→균일비드' },
  { id: '12', slug: 'cmm-metrology', file: '12-cmm-metrology.html', title: '3D 측정기 / CMM', domain: '품질', bg: '#0a0e14', blurb: 'CMM 프로브·GD&T·검사성적서·Cpk + 품질 신념·공차→코드 크로스오버' },
  { id: '13', slug: 'radar-sonar', file: '13-radar-sonar.html', title: '레이더 / 소나 PPI', domain: '탐지', bg: '#060a08', blurb: '스위프·컨택트·TRACK TABLE + insane-search 비용 사다리(200=검증 시작)' },
  { id: '14', slug: 'fluid-power', file: '14-fluid-power.html', title: '유압 / 공압 회로도', domain: '설비', bg: '#0a1426', blurb: 'ISO 1219 회로·실린더·흐름 + 멱등성/재시도(체크밸브=멱등키)' },
  { id: '15', slug: 'scada-hmi', file: '15-scada-hmi.html', title: 'SCADA HMI 패널', domain: '감시제어', bg: '#0e1217', blurb: 'P&ID 미믹·트렌드·알람 + 지식 볼트 운영 대시보드(HEALTH_THRESHOLDS)' },
  { id: '16', slug: 'robot-pendant', file: '16-robot-pendant.html', title: '로봇 티칭 펜던트', domain: '로보틱스', bg: '#0c0e12', blurb: '경력=프로그램 웨이포인트·조그·E-STOP + 하네스 엔지니어링(제약→자율)' },
  { id: '17', slug: 'gantt-cpm', file: '17-gantt-cpm.html', title: '간트 + 크리티컬 패스 + 스코어카드', domain: '경영·PM', bg: '#f5f3ee', featured: true, blurb: '경력 간트·크리티컬 패스·비즈니스 스코어카드 + 12주 Momentum·Life Wheel' },
  { id: '18', slug: 'sonar-waterfall', file: '18-sonar-waterfall.html', title: '소나 워터폴 / 스펙트로그램', domain: '신호·데이터', bg: '#060a10', blurb: '실시간 신호 4채널 워터폴(Mirrorless·솔라엣지·Work Radar·BI)' },
  { id: '19', slug: 'pid-scheme', file: '19-pid-scheme.html', title: 'P&ID 풀스킴 (데이터 플로우)', domain: '공정도·데이터', bg: '#eef0e8', featured: true, blurb: 'ISA-5.1 도면: 솔라엣지 MES·Mirrorless 큐·Work Radar 3 트레인' },
  { id: '20', slug: 'instrument-rack', file: '20-instrument-rack.html', title: '디지털 멀티미터 / 계측 랙', domain: '계측', bg: '#0b0d0f', blurb: 'DMM·calibration_profile·OCV/IR 스코프 + 관찰성 5층(카디널리티)' },
  { id: '21', slug: 'windtunnel-cfd', file: '21-windtunnel-cfd.html', title: '풍동 / CFD 유동해석', domain: '기구설계', bg: '#07101c', blurb: 'CadQuery 키오스크 냉각 유동·GPU 핫스팟·before/after 쿨링' },
  { id: '22', slug: 'db-architecture', file: '22-db-architecture.html', title: 'DB 모델링 & 데이터 아키텍처', domain: '데이터·DB', bg: '#0c0f14', featured: true, blurb: '실제 스키마(Mirrorless·KH·PG17)·SSOT Outbox+CDC·WITH RECURSIVE·볼트 스키마' },
  { id: '23', slug: 'agent-governance', file: '23-agent-governance.html', title: 'AI 에이전트 거버넌스 / Boule', domain: 'AI', bg: '#0a0d0f', featured: true, blurb: 'Boule 파이프라인·ticker/autonomy fail-closed + 자가통치 볼트 OS' },
  { id: '24', slug: 'delegation-cost', file: '24-delegation-cost.html', title: '위임 통화 환산기', domain: 'AI·사상', bg: '#0c0d10', featured: true, blurb: '"위임은 비용을 옮길 뿐" 인터랙티브 도구·5기둥 하네스' },
  { id: '25', slug: 'decision-os', file: '25-decision-os.html', title: '의사결정 트리 / Decision OS', domain: '의사결정', bg: '#0a0d12', featured: true, blurb: '가치 변위·결정론적 Gate→Score→Cap→Tiebreaker·append-only Ledger' },
  { id: '26', slug: 'graphrag', file: '26-graphrag.html', title: 'GraphRAG / 신경-기호', domain: 'AI', bg: '#080a0f', blurb: 'Leiden 커뮤니티 그래프·벡터↔그래프 멀티홉·검증가능성×설명가능성' },
  { id: '27', slug: 'writer-philosophy', file: '27-writer-philosophy.html', title: '거울 라이브러리 — 작가이자 사상가', domain: '인문', bg: '#f1ede3', featured: true, blurb: '시·에세이 실제 인용 + 철학 렌즈(의미=사용·리좀·존재론적 개입·융) + 신념' },
]

export const sceneById = (id: string) => SCENES.find((s) => s.id === id || s.slug === id)
export const featuredScenes = () => SCENES.filter((s) => s.featured)
