// pipeline-dag — Notion OS : 조직 운영 시스템 DAG data
// Extracted from public/lab/pipeline-dag.html

export interface NodeDef {
  id: string
  kind: 'source' | 'decision' | 'okr' | 'metric' | 'sink' | 'ai'
  col: number
  row: number
  type: 'extract' | 'transform' | 'load' | 'ml' | 'deploy'
  icon: string
  name: string
  sub: string
  dur: string
  runs: string
  desc: string
  kv: [string, string][]
  tags: string[]
  metric?: boolean
  big?: string
  dir?: string
  lbl?: string
  ml?: boolean
  ach?: [string, string][]
  status?: string
  // layout (populated by layout())
  x: number
  y: number
  w: number
  h: number
  // runtime DOM reference
  el?: HTMLElement
}

export const NODES: NodeDef[] = [
  // ---- SOURCE : 입력 ----
  { id:'src_meeting', kind:'source', col:0, row:0, type:'extract', icon:'📋', name:'Meeting',
    sub:'팀 회의 · 스탠드업 · 스프린트 플래닝 인풋', dur:'realtime', runs:'src.meeting.0001',
    desc:'모든 정보 흐름의 출발점. 회의에서 오고가는 논의·결정 후보·액션을 구조화된 포맷으로 캡처한다. Notion 회의록 DB에 자동 적재되며 AI 레이어가 결정 후보를 추출한다.',
    kv:[['source type','meeting notes'],['포맷','Notion DB · 구조화 템플릿'],['freshness','per session']],
    tags:['회의록','스탠드업','스프린트 플래닝','Notion'], x:0,y:0,w:0,h:0 },

  { id:'src_github', kind:'source', col:0, row:1, type:'extract', icon:'&#128570;', name:'GitHub',
    sub:'PR · 커밋 · 이슈 — 코드 정본(SSOT)', dur:'webhook', runs:'src.github.0002',
    desc:'코드 단일 출처(SSOT). PR 머지 이벤트가 AI 자동화 레이어를 트리거해 PRD 변경로그를 갱신하고 개발 뉴스를 요약한다. 이슈는 백로그와 실시간 동기화된다.',
    kv:[['source type','code SSOT'],['트리거','PR merge · issue close'],['연동','Runbook · PRD · Backlog']],
    tags:['GitHub','PR','이슈','코드SSOT','webhook'], x:0,y:0,w:0,h:0 },

  // ---- DECISION OS ----
  { id:'dec_ledger', kind:'decision', col:1, row:0, type:'transform', icon:'&#128220;', name:'Decision Ledger',
    sub:'모든 결정의 단일 기록부 — 맥락·근거·책임자', dur:'88ms', runs:'dec.ledger.v1',
    desc:'Decision OS의 핵심. 회의에서 도출된 결정 후보가 AI 추출을 거쳐 이곳에 영구 기록된다. 결정 날짜·맥락·찬반 근거·책임자·리뷰 일정을 함께 저장해 정보 유실을 방지한다.',
    kv:[['저장소','Notion Decision DB'],['필드','날짜 / 맥락 / 책임자 / 리뷰 기한'],['연동','Action Items · OKR']],
    tags:['Decision Ledger','의사결정','SSOT','맥락 보존','책임자'],
    ach:[['ZERO','결정 유실 0건'],['LINK','결정→액션 자동 연결'],['LOG','근거·반대의견 보존'],['SYNC','OKR 체크인 자동 연계']], x:0,y:0,w:0,h:0 },

  { id:'dec_values', kind:'decision', col:1, row:1, type:'transform', icon:'&#10024;', name:'Core Values',
    sub:'의사결정 필터 — 원칙 기반 판단 기준', dur:'static', runs:'dec.values.v1',
    desc:'모든 결정이 이 원칙 레이어를 통과한다. Notion 단일 페이지에 관리되며, 결정이 Core Values와 충돌할 때 자동으로 플래그를 세운다. 조직 문화와 전략적 일관성을 유지하는 거버넌스 게이트.',
    kv:[['형태','Notion 단일 페이지 (SSOT)'],['역할','의사결정 필터 · 문화 앵커'],['갱신','분기 리뷰 후 업데이트']],
    tags:['Core Values','원칙','문화','거버넌스','필터'], x:0,y:0,w:0,h:0 },

  { id:'dec_actions', kind:'decision', col:1, row:2, type:'transform', icon:'&#9989;', name:'Action Items',
    sub:'결정 → 담당자·기한·완료 상태 추적', dur:'sync', runs:'dec.actions.v1',
    desc:'Decision Ledger에서 도출된 액션이 자동으로 이 DB에 생성된다. 담당자·기한·우선순위·완료 여부를 추적하며, 미완료 액션은 다음 회의 아젠다에 자동 삽입된다.',
    kv:[['필드','담당자 / 기한 / 우선순위 / 상태'],['자동화','미완료 → 다음 회의 아젠다 자동 추가'],['연동','OKR 진척 업데이트 트리거']],
    tags:['Action Items','추적','완료율','아젠다 자동화'],
    ach:[['AUTO','미완료 자동 이월'],['LINK','결정→액션 1-to-N'],['TRACK','담당자별 완료율 대시보드'],['GATE','OKR 체크인 트리거']], x:0,y:0,w:0,h:0 },

  // ---- AI AUTOMATION ----
  { id:'ai_layer', kind:'ai', col:2, row:0, type:'ml', icon:'&#129504;', name:'AI Reconciliation Layer',
    sub:'회의록→결정 추출 · PR→PRD 갱신 · 개발뉴스 요약(자동)', dur:'auto', runs:'ai.layer.v2', ml:true,
    desc:'세 가지 자동화 파이프라인을 실행하는 AI 레이어. (1) 회의록에서 결정 후보를 자동 추출해 Decision Ledger 초안 생성. (2) GitHub PR 머지 시 PRD 변경로그 자동 갱신. (3) GitHub 이슈/커밋 요약으로 개발 뉴스 자동 생성. 반복 수작업을 제거하고 정보를 즉시 맥락에 연결한다.',
    kv:[['파이프라인 1','회의록 → 결정 후보 추출'],['파이프라인 2','PR → PRD 변경로그 갱신'],['파이프라인 3','GitHub → 개발 뉴스 자동 요약']],
    tags:['AI 자동화','결정 추출','PRD 갱신','개발뉴스','MCP'], x:0,y:0,w:0,h:0 },

  // ---- EXECUTION ----
  { id:'exec_okr', kind:'okr', col:3, row:0, type:'transform', icon:'&#127919;', name:'OKR / KPI',
    sub:'분기 Objectives · Key Results · 체크인 뷰', dur:'quarterly', runs:'exec.okr.v1',
    desc:'조직 목표의 단일 출처. 분기마다 Objectives와 Key Results를 설정하고, 회의 때는 "체크인 필요" 뷰만 노출해 집중도를 높인다. Action Items 완료가 Key Results 진척에 자동 반영된다.',
    kv:[['사이클','분기 OKR · 월별 KPI 체크인'],['Notion 뷰','체크인 필요 · 달성 · 위험'],['자동화','액션 완료 → KR 진척 업데이트']],
    tags:['OKR','KPI','분기','체크인','목표정렬'],
    ach:[['VIEW','체크인 필요 뷰만 노출'],['AUTO','액션→KR 자동 연산'],['RISK','지연 KR 자동 플래그'],['LOG','분기별 Objectives Logs 보관']], x:0,y:0,w:0,h:0 },

  { id:'exec_backlog', kind:'okr', col:3, row:1, type:'transform', icon:'&#128190;', name:'Backlog / Epic',
    sub:'우선순위 에픽 · GitHub 이슈 실시간 동기화', dur:'sync', runs:'exec.backlog.v1',
    desc:'제품 로드맵의 실행 큐. OKR 하위로 에픽이 구성되고, GitHub 이슈가 실시간 동기화된다. 우선순위·스프린트·담당팀이 Notion에서 관리되며 PRD로 업스트림한다.',
    kv:[['구조','OKR → Epic → Story → Task'],['동기화','GitHub 이슈 양방향 sync'],['우선순위','MoSCoW · 분기 OKR 정렬']],
    tags:['백로그','에픽','GitHub sync','로드맵','스프린트'], x:0,y:0,w:0,h:0 },

  { id:'exec_prd', kind:'okr', col:3, row:2, type:'transform', icon:'&#128196;', name:'PRD',
    sub:'제품 요구사항 문서 · AI 변경로그 자동 갱신', dur:'living doc', runs:'exec.prd.v1',
    desc:'제품 요구사항의 단일 출처. Backlog에픽에서 업스트림된 스펙과 AI 레이어가 PR마다 자동 갱신하는 변경로그가 한 문서에 공존한다. Runbook 실행 전 반드시 PRD가 승인된 상태여야 한다.',
    kv:[['갱신','PR 머지 시 AI 자동 변경로그 추가'],['승인 게이트','PRD approved → Runbook 실행'],['연동','Backlog · AI Layer · Runbook']],
    tags:['PRD','변경로그','제품 스펙','승인 게이트','AI 갱신'], x:0,y:0,w:0,h:0 },

  { id:'exec_runbook', kind:'okr', col:3, row:3, type:'deploy', icon:'&#9881;', name:'Runbook',
    sub:'실행 절차서 · 배포·온보딩·장애 대응 SOP', dur:'running', runs:'exec.runbook.v1', status:'running',
    desc:'PRD 승인 이후 실제 실행을 정의하는 절차서. 배포 체크리스트·온보딩 가이드·장애 대응 플레이북이 포함된다. GitHub Actions와 연동돼 배포 트리거가 자동으로 Runbook 실행 로그를 생성한다.',
    kv:[['포함','배포 체크리스트 · 온보딩 · 장애 플레이북'],['자동화','GitHub Actions → 실행 로그 자동 생성'],['전제','PRD approved']],
    tags:['Runbook','SOP','배포','장애대응','GitHub Actions'],
    ach:[['AUTO','배포 로그 자동 생성'],['SOP','온보딩 표준화'],['GATE','PRD 승인 필수'],['LIVE','현재 운영 중']], x:0,y:0,w:0,h:0 },

  // ---- SSOT GOVERNANCE ----
  { id:'gov_dash', kind:'metric', col:2, row:2, metric:true, big:'SSOT', dir:'up', lbl:'단일 출처 원칙', type:'load', name:'SSOT 거버넌스',
    sub:'gov.ssot', dur:'always', runs:'gov.ssot.v1', icon:'&#127963;',
    desc:'Notion(문서), GitHub(코드), Google Drive(민감 문서) 세 출처가 각자 정본을 담당한다. 중복 저장 금지 원칙으로 정보 충돌 및 유실을 방지한다.', kv:[['Notion','문서 · 결정 · 프로세스 정본'],['GitHub','코드 · 이슈 정본'],['Drive','민감 문서 정본']], tags:['SSOT','거버넌스','Notion','GitHub','Drive'], x:0,y:0,w:0,h:0 },

  { id:'gov_opdash', kind:'metric', col:2, row:3, metric:true, big:'LIVE', dir:'up', lbl:'Operating Dashboard', type:'load', name:'Operating Dashboard',
    sub:'ops.dashboard', dur:'realtime', runs:'gov.opdash.v1', icon:'&#128202;',
    desc:'OKR 진척·Action Items 완료율·AI 파이프라인 상태를 한 화면에 집계하는 운영 대시보드. Notion 데이터베이스 연산으로 실시간 갱신된다.', kv:[['갱신','realtime (Notion 자동 집계)'],['포함','OKR · 액션 · AI 상태'],['접근','전 팀원 공개']], tags:['대시보드','OKR','Action Items','Notion 집계'], x:0,y:0,w:0,h:0 },

  // ---- METRICS (output) ----
  { id:'m1', kind:'metric', col:4, row:0, metric:true, big:'100%', dir:'up', lbl:'결정 추적률', type:'load', name:'결정 추적률',
    sub:'dec.coverage', dur:'8ms', runs:'out.dec', icon:'&#128220;',
    desc:'회의에서 도출된 모든 결정이 Decision Ledger에 기록되는 비율. AI 추출 + 수동 보완으로 100% 달성.', kv:[['source','dec.coverage'],['type','coverage %']], tags:['결정','추적','커버리지'], x:0,y:0,w:0,h:0 },
  { id:'m2', kind:'metric', col:4, row:1, metric:true, big:'<2h', dir:'up', lbl:'결정→액션 지연', type:'load', name:'결정→액션 지연',
    sub:'dec.lag', dur:'8ms', runs:'out.lag', icon:'&#9889;',
    desc:'결정이 Decision Ledger에 기록된 후 Action Items에 생성되기까지 걸리는 시간. 자동화로 2시간 이내 달성.', kv:[['source','dec.lag'],['type','time-to-action']], tags:['자동화','지연','액션'], x:0,y:0,w:0,h:0 },
  { id:'m3', kind:'metric', col:4, row:2, metric:true, big:'Q+1', dir:'up', lbl:'OKR 사이클', type:'load', name:'OKR 사이클',
    sub:'okr.cycle', dur:'8ms', runs:'out.okr', icon:'&#127919;',
    desc:'분기 OKR 체크인 완료율. 매 분기 시작 전 다음 분기 OKR이 확정되는 Q+1 패턴 운영.', kv:[['source','okr.cycle'],['type','quarterly cadence']], tags:['OKR','분기','체크인'], x:0,y:0,w:0,h:0 },
  { id:'m4', kind:'metric', col:4, row:3, metric:true, big:'3 src', dir:'up', lbl:'SSOT 출처 수', type:'load', name:'SSOT 출처',
    sub:'ssot.count', dur:'8ms', runs:'out.ssot', icon:'&#127963;',
    desc:'Notion · GitHub · Google Drive — 세 출처가 각자 영역의 단일 정본 역할. 중복 없음.', kv:[['source','ssot.count'],['type','source count']], tags:['SSOT','출처','거버넌스'], x:0,y:0,w:0,h:0 },
  { id:'m5', kind:'metric', col:4, row:4, metric:true, big:'0', dir:'up', lbl:'정보 유실 건수', type:'load', name:'정보 유실',
    sub:'info.loss', dur:'8ms', runs:'out.loss', icon:'&#10003;',
    desc:'구조화 캡처 + AI 추출 + SSOT 원칙으로 달성한 결정/액션 정보 유실 0건.', kv:[['source','info.loss'],['type','zero loss']], tags:['유실','품질','SSOT'], x:0,y:0,w:0,h:0 },
  { id:'m6', kind:'metric', col:4, row:5, metric:true, big:'AUTO', dir:'up', lbl:'AI 파이프라인', type:'load', name:'AI 파이프라인',
    sub:'ai.pipelines', dur:'8ms', runs:'out.ai', icon:'&#129504;',
    desc:'회의록 추출 · PR 갱신 · 개발뉴스 요약 — 세 파이프라인이 상시 자동 실행.', kv:[['source','ai.pipelines'],['type','automation']], tags:['AI','자동화','파이프라인'], x:0,y:0,w:0,h:0 },

  // ---- RETROSPECTIVE (sink) ----
  { id:'sink_retro', kind:'sink', col:5, row:2, type:'load', icon:'&#128260;', name:'Retrospective',
    sub:'스프린트 회고 · 조직 학습 싱크', dur:'sprint', runs:'sink.retro.v1',
    desc:'모든 흐름이 수렴하는 최종 싱크. 스프린트 완료 후 Decision Ledger · Action Items · OKR 달성 결과를 종합해 회고록을 생성한다. 회고의 개선 사항은 다음 사이클의 Meeting 인풋으로 피드백되며 루프를 닫는다.',
    kv:[['산출물','스프린트 회고록 · 개선 액션'],['피드백','개선사항 → 다음 Meeting 인풋'],['주기','스프린트 종료 · 분기 말']],
    tags:['회고','스프린트','조직학습','피드백 루프'], x:0,y:0,w:0,h:0 },
]

// edges: 위상정렬 순서
export const EDGES: [string, string][] = [
  ['src_meeting','dec_ledger'],
  ['src_meeting','ai_layer'],
  ['src_github','ai_layer'],
  ['src_github','exec_backlog'],
  ['dec_values','dec_ledger'],
  ['dec_values','dec_actions'],
  ['dec_ledger','dec_actions'],
  ['dec_ledger','exec_okr'],
  ['ai_layer','dec_ledger'],
  ['ai_layer','exec_prd'],
  ['ai_layer','gov_dash'],
  ['dec_actions','exec_okr'],
  ['dec_actions','exec_backlog'],
  ['gov_dash','gov_opdash'],
  ['gov_opdash','exec_okr'],
  ['exec_okr','exec_backlog'],
  ['exec_backlog','exec_prd'],
  ['exec_prd','exec_runbook'],
  ['dec_ledger','m1'],
  ['dec_actions','m2'],
  ['exec_okr','m3'],
  ['gov_dash','m4'],
  ['ai_layer','m5'],
  ['ai_layer','m6'],
  ['exec_runbook','sink_retro'],
  ['exec_okr','sink_retro'],
  ['m1','sink_retro'],['m3','sink_retro'],['m5','sink_retro'],
]

const COLX = [80, 370, 700, 1010, 1320, 1650]
const ROWH = 155
const NODE_W = 230
const NODE_MW = 170

export const SCHEMAS = [
  {h:'schema: meeting_record',rows:[['decision_candidate','string'],['action_item','string'],['owner','string'],['ts','datetime']]},
  {h:'schema: decision_entry',rows:[['id','uuid'],['context','text'],['owner','string'],['review_date','date']]},
  {h:'schema: action_item',rows:[['title','string'],['owner','string'],['due','date'],['status','enum']]},
  {h:'schema: okr_entry',rows:[['objective','string'],['key_result','string[]'],['progress','float'],['quarter','string']]},
  {h:'schema: prd_change',rows:[['pr_id','string'],['summary','text'],['affected_spec','string[]'],['ts','datetime']]},
]

export const LOG_TEMPLATES = [
  {cls:'ok', pipe:'[meeting→dec]', msgs:[
    '결정 후보 추출: "Q3 디자인 시스템 통합" — 신뢰도 0.91',
    '결정 후보 추출: "온보딩 Runbook 분기 갱신" — 신뢰도 0.87',
    '결정 후보 추출: "Backlog MoSCoW 재우선순위" — 신뢰도 0.83',
    '결정 후보 추출: "AI 파이프라인 3개 → 5개 확장" — 신뢰도 0.95',
    '결정 후보 추출: "스프린트 주기 2주 → 1주 실험" — 신뢰도 0.78',
    '결정 후보 추출: "SSOT: Drive 민감문서 정책 갱신" — 신뢰도 0.89',
  ]},
  {cls:'w', pipe:'[pr→prd]', msgs:[
    'PR #214 머지 → PRD 변경로그 자동 갱신 (auth-flow v2)',
    'PR #217 머지 → PRD 변경로그 자동 갱신 (design-token sync)',
    'PR #221 머지 → PRD 변경로그 자동 갱신 (backlog-api)',
    'PR #229 머지 → PRD 변경로그 자동 갱신 (OKR-widget)',
    'PR #233 머지 → PRD 변경로그 자동 갱신 (runbook-v3)',
  ]},
  {cls:'w', pipe:'[github→news]', msgs:[
    '개발뉴스 요약: "이번 주 17 커밋 · 버그 2건 해결 · 신규 Epic 1건"',
    '개발뉴스 요약: "PR 12건 리뷰 완료 · Backlog 감소 8% · 배포 성공"',
    '개발뉴스 요약: "스프린트 속도 +11% · 이슈 close율 94%"',
    '개발뉴스 요약: "Auth 모듈 리팩토링 완료 · 테스트 커버리지 87%"',
  ]},
]

export const METRIC_DEFS: Record<string, { base: string; variants: string[] }> = {
  m1: { base:'100%',  variants:['99.7%','100%','100%','99.8%','100%'] },
  m2: { base:'<2h',   variants:['<1.8h','<2h','<2.1h','<1.9h','<2h'] },
  m3: { base:'Q+1',   variants:['Q+1','Q+1','Q+1'] },
  m4: { base:'3 src', variants:['3 src'] },
  m5: { base:'0',     variants:['0','0','0','0'] },
  m6: { base:'AUTO',  variants:['AUTO'] },
}

export function doLayout(nodes: NodeDef[]) {
  const colRows: Record<number, number> = {}
  nodes.forEach(n => { colRows[n.col] = Math.max(colRows[n.col] || 0, n.row + 1) })
  const maxRows = Math.max(...Object.values(colRows))
  nodes.forEach(n => {
    const rows = colRows[n.col]
    const colHeight = rows * ROWH
    const maxHeight = maxRows * ROWH
    const offset = (maxHeight - colHeight) / 2
    n.x = COLX[n.col]
    n.y = 40 + offset + n.row * ROWH
    n.w = n.metric ? NODE_MW : NODE_W
    n.h = n.ml ? 200 : (n.metric ? 96 : 120)
  })
}

export function worldBounds(nodes: NodeDef[]) {
  let maxX = 0, maxY = 0
  nodes.forEach(n => { maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h) })
  return { w: maxX + 120, h: maxY + 120 }
}
