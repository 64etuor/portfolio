// P&ID Scene — detail panel data (large constant object extracted from HTML)

export interface PanelData {
  tag: string
  title: string
  type: string
  body: string
}

export const DATA: Record<string, PanelData> = {
  // TRAIN A
  client: {
    tag: 'START-A01 · 단일 EC2',
    title: '단일 EC2 운영 상태',
    type: 'Train A · 시작 상태',
    body: '<div class="sec"><h4>문제</h4><p>백엔드가 단일 EC2에서 운영되어 장애 시 수동 SSH 복구가 필요했고, 배포 중 다운타임과 관측 공백이 동시에 발생했다.</p></div><div class="sec"><h4>전환 방향</h4><p>ALB Target Group 뒤에 ECS Service를 두고 desired count와 health check로 인스턴스 단일 장애점을 제거한다.</p></div><div class="sec"><h4>키워드</h4><span class="chip">single EC2</span><span class="chip">manual recovery</span><span class="chip">downtime</span></div>',
  },
  gateway: {
    tag: 'LSN-A02 · ALB Listener',
    title: 'ALB Listener',
    type: 'Train A · 트래픽 진입',
    body: '<div class="sec"><h4>역할</h4><p>HTTPS 443 진입점을 ALB Listener로 고정하고, 대상 그룹 상태에 따라 정상 ECS task로만 트래픽을 전달한다.</p></div><div class="sec"><h4>운영 포인트</h4><ul><li>SSL/TLS 종료 지점 명확화</li><li>Target Group health check 연동</li><li>배포 중 healthy target 유지</li></ul></div><div class="sec"><h4>AWS 리소스</h4><span class="chip">ALB</span><span class="chip">Listener</span><span class="chip">Target Group</span></div>',
  },
  targetgroup: {
    tag: 'TG-A03 · ALB Target Group',
    title: 'ALB Target Group',
    type: 'Train A · 헬스체크 매니폴드',
    body: '<div class="sec"><h4>역할</h4><p>ECS task를 대상으로 등록하고 health check가 실패한 task를 트래픽 경로에서 제외한다. 장애 복구 기준을 사람의 판단이 아니라 ALB 상태 판정으로 이동시킨다.</p></div><div class="sec"><h4>운영 포인트</h4><span class="chip">health check path</span><span class="chip">deregistration delay</span><span class="chip">healthy threshold</span></div>',
  },
  service: {
    tag: 'SVC-A04 · ECS Service',
    title: 'ECS Service',
    type: 'Train A · 런타임 프로세서',
    body: '<div class="sec"><h4>역할</h4><p>컨테이너화된 백엔드를 desired count 2 이상으로 유지하고, task 교체·재시작·rolling deployment를 ECS scheduler에 위임한다.</p></div><div class="sec"><h4>효과</h4><ul><li>단일 EC2 장애점 제거</li><li>배포 중 신규 task 정상화 후 이전 task drain</li><li>서비스 상태를 CloudWatch 지표로 노출</li></ul></div><div class="sec"><h4>AWS 리소스</h4><span class="chip">ECS Service</span><span class="chip">Task Definition</span><span class="chip">Service Auto Recovery</span></div>',
  },
  db: {
    tag: 'TK-A05 · 데이터 베셀',
    title: 'RDS / Data Store',
    type: 'Train A · 상태 저장소',
    body: '<div class="sec"><h4>역할</h4><p>ECS task가 stateless로 교체될 수 있도록 애플리케이션 상태를 외부 데이터 저장소에 둔다. 런타임 이중화와 데이터 영속성을 분리한다.</p></div><div class="sec"><h4>운영 포인트</h4><span class="chip">connection metrics</span><span class="chip">backup</span><span class="chip">migration window</span></div>',
  },
  response: {
    tag: 'DEP-A06 · Rolling Deploy',
    title: 'ECS Rolling Deployment',
    type: 'Train A · 배포 전환',
    body: '<div class="sec"><h4>역할</h4><p>새 task가 Target Group health check를 통과한 뒤 기존 task를 drain한다. 배포 중 다운타임을 줄이는 핵심 전환 지점이다.</p></div><div class="sec"><h4>운영 포인트</h4><span class="chip">minimum healthy percent</span><span class="chip">deployment health gate</span><span class="chip">rollback decision</span></div>',
  },
  ratelimit: {
    tag: 'HC-A1 · Health Gate',
    title: 'ALB Health Check Gate',
    type: 'Train A · 배포/트래픽 밸브',
    body: '<div class="sec"><h4>역할</h4><p>Target Group이 healthy로 판정한 task에만 트래픽을 열어 배포 중 장애 task 노출을 막는다.</p></div><div class="sec"><h4>설정면</h4><span class="chip">health check path</span><span class="chip">interval</span><span class="chip">threshold</span></div>',
  },
  'ft-a101': {
    tag: 'FT-A101 · ALB RequestCount',
    title: 'ALB 요청량 계측',
    type: '계측기 · CloudWatch Metric',
    body: '<div class="sec"><h4>측정</h4><p>ALB RequestCount와 TargetResponseTime을 CloudWatch metric으로 수집해 배포 전후 트래픽 변화를 확인한다.</p></div>',
  },
  'ai-a102': {
    tag: 'HC-A102 · Target Health',
    title: 'Target Group Health 계측',
    type: '계측기 · ALB Health',
    body: '<div class="sec"><h4>측정</h4><p>HealthyHostCount와 UnHealthyHostCount로 ECS task가 실제로 트래픽을 받을 준비가 되었는지 판단한다.</p></div>',
  },
  'qic-a103': {
    tag: 'SIC-A103 · ECS Count',
    title: 'ECS Desired/Running Count',
    type: '계측기 · Service Indicator',
    body: '<div class="sec"><h4>측정</h4><p>ECS desired count와 running count의 차이를 확인해 scheduler가 원하는 복제 수를 회복했는지 본다.</p></div>',
  },
  'lic-a104': {
    tag: 'LIC-A104 · DB Connection',
    title: 'DB Connection Level',
    type: '계측기 · Resource Level',
    body: '<div class="sec"><h4>측정</h4><p>배포·스케일 전환 중 DB 커넥션 사용률이 급증하지 않는지 관측한다. 인프라 전환의 병목 후보를 분리하는 지표다.</p></div>',
  },
  'qv-a105': {
    tag: 'DG-A105 · Deployment Gate',
    title: 'Deployment Health Gate',
    type: '계측기 · 배포 판정',
    body: '<div class="sec"><h4>검증</h4><p>ALB target health, ECS running count, CloudWatch alarm 상태가 모두 정상이면 rolling deployment를 완료 상태로 본다.</p></div>',
  },

  // TRAIN B
  producer: {
    tag: 'MOD-B · Terraform Modules',
    title: 'Terraform Module Inputs',
    type: 'Train B · IaC 입력',
    body: '<div class="sec"><h4>역할</h4><p>ALB, ECS, CloudWatch, Sentry 연계값을 모듈 단위로 분리해 콘솔 수동 변경을 코드 리뷰 가능한 변경으로 바꾼다.</p></div><div class="sec"><h4>파일면</h4><span class="chip">alb.tf</span><span class="chip">ecs.tf</span><span class="chip">observability.tf</span></div>',
  },
  tfplan: {
    tag: 'PLAN-B12 · Terraform Plan',
    title: 'Terraform Plan Review',
    type: 'Train B · 변경 검토',
    body: '<div class="sec"><h4>역할</h4><p>실제 apply 전에 생성·변경·삭제 리소스를 확인한다. 인프라 변경의 범위와 위험을 배포 전 검토 가능한 형태로 만든다.</p></div><div class="sec"><h4>검토 항목</h4><ul><li>ALB listener / target group 변경</li><li>ECS service desired count 변경</li><li>CloudWatch alarm 추가</li></ul></div><div class="sec"><h4>키워드</h4><span class="chip">terraform plan</span><span class="chip">diff</span><span class="chip">blast radius</span></div>',
  },
  idempkey: {
    tag: 'LOCK-B14 · Remote State',
    title: 'Terraform Remote State Lock',
    type: 'Train B · 상태 잠금',
    body: '<div class="sec"><h4>역할</h4><p>동시 apply로 인프라 상태가 꼬이지 않도록 remote state와 lock을 둔다. 운영자가 콘솔에서 직접 만지는 흐름을 줄이고, 변경 이력을 코드와 state에 남긴다.</p></div><div class="sec"><h4>키워드</h4><span class="chip">remote state</span><span class="chip">state lock</span><span class="chip">drift control</span></div>',
  },
  tfapply: {
    tag: 'APPLY-B15 · Terraform Apply',
    title: 'Terraform Apply Control Loop',
    type: 'Train B · 적용 루프',
    body: '<div class="sec"><h4>역할</h4><p>검토된 plan을 AWS 리소스에 적용하고, ECS service가 stable 상태로 수렴할 때까지 배포 게이트와 관측 지표를 확인한다.</p></div><div class="sec"><h4>상태</h4><p>PLAN → APPLY → STABILIZE → RECORDED 순서로 인프라 코드와 실제 리소스를 맞춘다.</p></div><div class="sec"><h4>키워드</h4><span class="chip">terraform apply</span><span class="chip">service stable</span><span class="chip">state recorded</span></div>',
  },
  dbcommit: {
    tag: 'TK-B17 · AWS Resource State',
    title: 'AWS Resource State',
    type: 'Train B · 적용 결과',
    body: '<div class="sec"><h4>역할</h4><p>ALB, Target Group, ECS Service, CloudWatch Alarm이 코드화된 기준선으로 생성·갱신된 결과 지점이다.</p></div><div class="sec"><h4>AWS 리소스</h4><span class="chip">ALB</span><span class="chip">ECS</span><span class="chip">CloudWatch</span></div>',
  },
  dlq: {
    tag: 'DRIFT-B19 · Drift Review',
    title: 'Drift Review Queue',
    type: 'Train B · 수동 변경 격리',
    body: '<div class="sec"><h4>역할</h4><p>콘솔에서 생긴 수동 변경이나 예상 밖 리소스 차이를 drift로 격리한다. 바로 덮어쓰지 않고 plan 재검토 대상으로 올린다.</p></div><div class="sec"><h4>키워드</h4><span class="chip">drift</span><span class="chip">manual change</span><span class="chip">review before apply</span></div>',
  },
  'ti-b11': {
    tag: 'VC-B11 · Module Version',
    title: 'Terraform Module Version Check',
    type: '계측기 · Version Control',
    body: '<div class="sec"><h4>검증</h4><p>인프라 모듈 버전과 변경 파일을 확인해 재현 가능한 배포 단위로 묶는다.</p></div>',
  },
  'pi-b12': {
    tag: 'PD-B12 · Plan Diff',
    title: 'Terraform Plan Diff Gauge',
    type: '계측기 · 변경 압력',
    body: '<div class="sec"><h4>측정</h4><p>생성·변경·삭제 리소스 수와 영향 범위를 plan 단계에서 확인한다.</p></div>',
  },
  'qt-b13': {
    tag: 'SL-B13 · State Lock',
    title: 'Remote State Lock Indicator',
    type: '계측기 · 상태 잠금',
    body: '<div class="sec"><h4>검증</h4><p>apply 전에 state lock이 확보되었는지 확인해 동시 변경으로 인한 상태 불일치를 막는다.</p></div>',
  },
  'lic-b16': {
    tag: 'SIC-B16 · Apply State',
    title: 'Terraform Apply State Indicator',
    type: '계측기 · 적용 상태',
    body: '<div class="sec"><h4>제어</h4><p>PLAN, APPLY, STABILIZE, RECORDED 상태를 순차적으로 표시한다. 화면의 움직임은 실제 로그가 아니라 작업 단계를 설명하는 도식이다.</p></div>',
  },
  'cw-b18': {
    tag: 'CW-B18 · CloudWatch',
    title: 'CloudWatch Alarm Attachment',
    type: '계측기 · AWS 관측',
    body: '<div class="sec"><h4>측정</h4><p>Terraform으로 생성된 ECS/ALB 리소스에 CloudWatch metric과 alarm을 연결한다.</p></div>',
  },

  // TRAIN C
  obsources: {
    tag: 'GHOST-C20 · 없는 도구의 음영',
    title: '빈 관제 자리',
    type: 'Train C · Before State',
    body: '<div class="sec"><h4>문제</h4><p>에러 추적 없음, 비용 가시성 없음, 수동 복구라는 빈 자리를 점선 고스트로 먼저 배치했다. 이후 CloudWatch와 Sentry가 그 자리를 채우는 구조다.</p></div><div class="sec"><h4>정본 문제</h4><p>단일 EC2 장애 시 수동 복구, 배포 중 다운타임, 비용 가시성 부재, 에러 추적 불가.</p></div>',
  },
  aggregator: {
    tag: 'CW-C21 · CloudWatch',
    title: 'CloudWatch Metrics / Logs / Alarms',
    type: 'Train C · AWS 관측 코어',
    body: '<div class="sec"><h4>역할</h4><p>ALB와 ECS에서 나오는 metric, log, alarm을 CloudWatch로 모은다. 비용과 장애 신호를 운영자가 볼 수 있는 표면으로 끌어올린다.</p></div><div class="sec"><h4>구성</h4><ul><li>ALB TargetResponseTime / HealthyHostCount</li><li>ECS CPU/Memory/RunningTaskCount</li><li>log retention과 alarm action</li></ul></div><div class="sec"><h4>AWS 리소스</h4><span class="chip">CloudWatch Metrics</span><span class="chip">Log Group</span><span class="chip">Alarm</span></div>',
  },
  tsdb: {
    tag: 'LG-C22 · Log Group',
    title: 'CloudWatch Log Group / Retention',
    type: 'Train C · 로그/비용 표면',
    body: '<div class="sec"><h4>역할</h4><p>로그 보존 기간을 코드로 관리해 비용 가시성 부재를 줄인다. 장기 보존이 필요한 신호와 단기 운영 로그를 분리하는 지점이다.</p></div><div class="sec"><h4>키워드</h4><span class="chip">retention</span><span class="chip">cost visibility</span><span class="chip">log group</span></div>',
  },
  dashboard: {
    tag: 'SENTRY-C23 · Error Trace',
    title: 'Sentry Error Tracking',
    type: 'Train C · 에러 추적',
    body: '<div class="sec"><h4>역할</h4><p>런타임 예외를 Sentry issue와 trace로 묶어 에러 추적 불가 상태를 해소한다. CloudWatch가 인프라 신호를 맡고, Sentry가 애플리케이션 예외 맥락을 보강한다.</p></div><div class="sec"><h4>키워드</h4><span class="chip">Sentry</span><span class="chip">issue grouping</span><span class="chip">trace context</span></div>',
  },
  humangate: {
    tag: 'RUN-C24 · Alarm + Runbook',
    title: 'Alarm / Runbook / Rollback',
    type: 'Train C · 복구 절차화',
    body: '<div class="sec"><h4>역할</h4><p>CloudWatch alarm을 triage, runbook, rollback, verify 순서로 연결해 수동 복구를 기억 의존 작업이 아니라 절차화된 운영면으로 바꾼다.</p></div><div class="sec"><h4>운영 흐름</h4><ul><li>alarm: 임계치 기반 감지</li><li>triage: 영향 범위 확인</li><li>runbook/rollback: 복구 절차 실행</li><li>verify: ALB/ECS/CloudWatch 상태 확인</li></ul></div><div class="sec"><h4>키워드</h4><span class="chip">CloudWatch Alarm</span><span class="chip">runbook</span><span class="chip">rollback</span></div>',
  },
  'fc-c21': {
    tag: 'FC-C21 · Signal Flow',
    title: 'CloudWatch Signal Flow Control',
    type: '계측기 · 플로우 컨트롤',
    body: '<div class="sec"><h4>제어</h4><p>ALB/ECS metric과 log가 CloudWatch로 들어오는 경로를 표시한다. 샘플링 수치가 아니라 설계상 연결 지점을 보여주는 계측 버블이다.</p></div>',
  },
  'li-c22': {
    tag: 'LI-C22 · Retention Level',
    title: 'Log Retention / Cost Indicator',
    type: '계측기 · 비용 가시성',
    body: '<div class="sec"><h4>측정</h4><p>CloudWatch log retention 설정과 비용 가시성 확보 지점을 표시한다.</p></div>',
  },
}
