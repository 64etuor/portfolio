import { registerSceneText } from '../_host/localize'

/** English projection of this scene's Korean copy (exact strings first, then word-level terms). */
registerSceneText({
  // ── header / readouts / train bands ──
  'P&ID 시스템 토폴로지 — 소프트웨어 아키텍처 도면': 'P&ID System Topology — Software Architecture Drawing',
  '단일 EC2': 'Single EC2',
  'TRAIN A · RUNTIME CUTOVER — 단일 EC2 → ECS Service + ALB Target Group 이중화':
    'TRAIN A · RUNTIME CUTOVER — Single EC2 → ECS Service + ALB Target Group redundancy',
  '수동 복구가 필요했던 단일 EC2 운영면을 ALB health check · ECS desired count · rolling deploy 흐름으로 전환':
    'Moved the manually recovered single-EC2 setup to an ALB health check · ECS desired count · rolling deploy flow',
  'TRAIN B · TERRAFORM IAC MODULE — 인프라 코드화 / 배포 표준화':
    'TRAIN B · TERRAFORM IAC MODULE — Infra as code / standard deploys',
  'Terraform plan → state lock → apply → AWS resource convergence · ALB/ECS/CloudWatch 모듈 기준선':
    'Terraform plan → state lock → apply → AWS resource convergence · ALB/ECS/CloudWatch module baseline',
  'TRAIN C · OBSERVABILITY FILL-IN — CloudWatch · Sentry 관측 표면':
    'TRAIN C · OBSERVABILITY FILL-IN — CloudWatch · Sentry observability surface',
  '비어 있던 관제 자리(에러 추적 없음 · 비용 가시성 없음 · 수동 복구)를 메트릭 · 로그 · 트레이스 · 알람으로 채움':
    'Filled the empty monitoring slots (no error tracking · no cost visibility · manual recovery) with metrics · logs · traces · alarms',

  // ── scheme labels ──
  '수동 복구 운영면': 'Manual ops',
  'diff 검토 / blast radius': 'diff review / blast radius',
  'TERRAFORM APPLY 제어루프 · SP=SERVICE STABLE': 'TERRAFORM APPLY CONTROL LOOP · SP=SERVICE STABLE',
  '수동 변경 격리': 'Manual drift',
  'plan 재검토': 'plan re-review',
  '에러 추적 없음': 'No error tracking',
  '비용 가시성 없음': 'No cost visibility',
  '수동 복구': 'Manual recovery',
  'ALARM + RUNBOOK · 수동 복구를 절차화': 'ALARM + RUNBOOK · manual recovery made procedural',
  'healthy target 비율': 'healthy target ratio',
  '클릭=검증': 'click=verify',
  'ALB health check 통과 후 ECS rolling deploy 허용': 'ALB health pass → ECS rolling deploy',

  // ── tool sequence ──
  '비어 있던 관제 도구가 CloudWatch와 Sentry로 채워지는 순서':
    'Order in which the missing monitoring tools are filled by CloudWatch and Sentry',
  'Before · 없는 도구의 음영': 'Before · shadows of missing tools',
  'Built · 인프라·관제': 'Built · infra & monitoring',
  '콘솔 수동 변경': 'Manual console changes',
  '배포 중 다운타임': 'Downtime during deploys',

  // ── legend / title block / hint ──
  '프로세스 데이터 흐름': 'Process data flow',
  '신호/계측 링크': 'Signal/instrument link',
  '소프트웨어 링크': 'Software link',
  '현장 계측기(field)': 'Field instrument',
  '패널/SW 계측기': 'Panel/SW instrument',
  'ECS 서비스/프로세서': 'ECS service/processor',
  '헬스체크/배포 게이트': 'Health check/deploy gate',
  '데이터스토어/베셀': 'Datastore/vessel',
  '없는 도구의 음영': 'Shadow of a missing tool',
  '도면명 / TITLE': 'TITLE',
  'ECS/Terraform 관제 토폴로지': 'ECS/Terraform monitoring topology',
  '날짜 / DATE': 'DATE',
  '설계 / DESIGNED': 'DESIGNED',
  '▷ 계측기(bubble) · 서비스 · 베셀을 클릭하면 인프라 상세가 열립니다. · DEPLOY HEALTH INTERLOCK을 클릭하면 ALB 헬스체크 → ECS rolling deploy 허용 시퀀스가 작동합니다.':
    '▷ Click an instrument bubble, service or vessel to open infra details. · Click DEPLOY HEALTH INTERLOCK to run the ALB health check → ECS rolling deploy permit sequence.',
  '제목': 'Title',

  // ── detail panel: tags / titles / types ──
  'START-A01 · 단일 EC2': 'START-A01 · Single EC2',
  '단일 EC2 운영 상태': 'Single EC2 operation',
  'Train A · 시작 상태': 'Train A · starting state',
  'Train A · 트래픽 진입': 'Train A · traffic ingress',
  'Train A · 헬스체크 매니폴드': 'Train A · health check manifold',
  'Train A · 런타임 프로세서': 'Train A · runtime processor',
  'TK-A05 · 데이터 베셀': 'TK-A05 · data vessel',
  'Train A · 상태 저장소': 'Train A · state store',
  'Train A · 배포 전환': 'Train A · deploy cutover',
  'Train A · 배포/트래픽 밸브': 'Train A · deploy/traffic valve',
  'ALB 요청량 계측': 'ALB request count gauge',
  '계측기 · CloudWatch Metric': 'Instrument · CloudWatch Metric',
  'Target Group Health 계측': 'Target Group Health gauge',
  '계측기 · ALB Health': 'Instrument · ALB Health',
  '계측기 · Service Indicator': 'Instrument · Service Indicator',
  '계측기 · Resource Level': 'Instrument · Resource Level',
  '계측기 · 배포 판정': 'Instrument · deploy verdict',
  'Train B · IaC 입력': 'Train B · IaC input',
  'Train B · 변경 검토': 'Train B · change review',
  'Train B · 상태 잠금': 'Train B · state lock',
  'Train B · 적용 루프': 'Train B · apply loop',
  'Train B · 적용 결과': 'Train B · apply result',
  'Train B · 수동 변경 격리': 'Train B · manual change isolation',
  '계측기 · Version Control': 'Instrument · Version Control',
  '계측기 · 변경 압력': 'Instrument · change pressure',
  '계측기 · 상태 잠금': 'Instrument · state lock',
  '계측기 · 적용 상태': 'Instrument · apply state',
  '계측기 · AWS 관측': 'Instrument · AWS observability',
  'GHOST-C20 · 없는 도구의 음영': 'GHOST-C20 · shadow of missing tools',
  '빈 관제 자리': 'Empty monitoring slots',
  'Train C · AWS 관측 코어': 'Train C · AWS observability core',
  'Train C · 로그/비용 표면': 'Train C · log/cost surface',
  'Train C · 에러 추적': 'Train C · error tracking',
  'Train C · 복구 절차화': 'Train C · recovery procedure',
  '계측기 · 플로우 컨트롤': 'Instrument · flow control',
  '계측기 · 비용 가시성': 'Instrument · cost visibility',

  // ── detail panel: section headings ──
  '문제': 'Problem',
  '전환 방향': 'Direction',
  '키워드': 'Keywords',
  '역할': 'Role',
  '운영 포인트': 'Ops points',
  'AWS 리소스': 'AWS resources',
  '효과': 'Effect',
  '설정면': 'Settings',
  '측정': 'Measures',
  '검증': 'Verification',
  '파일면': 'Files',
  '검토 항목': 'Review items',
  '상태': 'State',
  '제어': 'Control',
  '정본 문제': 'Canonical problems',
  '구성': 'Composition',
  '운영 흐름': 'Ops flow',

  // ── detail panel: body copy ──
  '백엔드가 단일 EC2에서 운영되어 장애 시 수동 SSH 복구가 필요했고, 배포 중 다운타임과 관측 공백이 동시에 발생했다.':
    'The backend ran on a single EC2, so failures needed manual SSH recovery, and deploys caused downtime and monitoring gaps at the same time.',
  'ALB Target Group 뒤에 ECS Service를 두고 desired count와 health check로 인스턴스 단일 장애점을 제거한다.':
    'Put an ECS Service behind an ALB Target Group and remove the single point of failure with desired count and health checks.',
  'HTTPS 443 진입점을 ALB Listener로 고정하고, 대상 그룹 상태에 따라 정상 ECS task로만 트래픽을 전달한다.':
    'Fix the HTTPS 443 entry point on the ALB Listener and route traffic only to healthy ECS tasks based on target group state.',
  'SSL/TLS 종료 지점 명확화': 'Clear SSL/TLS termination point',
  'Target Group health check 연동': 'Target Group health check integration',
  '배포 중 healthy target 유지': 'Keep healthy targets during deploys',
  'ECS task를 대상으로 등록하고 health check가 실패한 task를 트래픽 경로에서 제외한다. 장애 복구 기준을 사람의 판단이 아니라 ALB 상태 판정으로 이동시킨다.':
    'Registers ECS tasks as targets and drops tasks that fail the health check from the traffic path. Recovery is decided by ALB health state, not human judgment.',
  '컨테이너화된 백엔드를 desired count 2 이상으로 유지하고, task 교체·재시작·rolling deployment를 ECS scheduler에 위임한다.':
    'Keeps the containerized backend at desired count 2 or more and delegates task replacement, restarts and rolling deployment to the ECS scheduler.',
  '단일 EC2 장애점 제거': 'Single-EC2 point of failure removed',
  '배포 중 신규 task 정상화 후 이전 task drain': 'During deploys, old tasks drain once new tasks are healthy',
  '서비스 상태를 CloudWatch 지표로 노출': 'Service state exposed as CloudWatch metrics',
  'ECS task가 stateless로 교체될 수 있도록 애플리케이션 상태를 외부 데이터 저장소에 둔다. 런타임 이중화와 데이터 영속성을 분리한다.':
    'Keeps application state in an external data store so ECS tasks can be replaced statelessly. Separates runtime redundancy from data persistence.',
  '새 task가 Target Group health check를 통과한 뒤 기존 task를 drain한다. 배포 중 다운타임을 줄이는 핵심 전환 지점이다.':
    'Old tasks drain only after new tasks pass the Target Group health check. This is the key cutover point for reducing deploy downtime.',
  'Target Group이 healthy로 판정한 task에만 트래픽을 열어 배포 중 장애 task 노출을 막는다.':
    'Opens traffic only to tasks the Target Group marks healthy, so failing tasks are never exposed during deploys.',
  'ALB RequestCount와 TargetResponseTime을 CloudWatch metric으로 수집해 배포 전후 트래픽 변화를 확인한다.':
    'Collects ALB RequestCount and TargetResponseTime as CloudWatch metrics to compare traffic before and after deploys.',
  'HealthyHostCount와 UnHealthyHostCount로 ECS task가 실제로 트래픽을 받을 준비가 되었는지 판단한다.':
    'Uses HealthyHostCount and UnHealthyHostCount to judge whether ECS tasks are actually ready to take traffic.',
  'ECS desired count와 running count의 차이를 확인해 scheduler가 원하는 복제 수를 회복했는지 본다.':
    'Compares ECS desired count and running count to see whether the scheduler has restored the target replica count.',
  '배포·스케일 전환 중 DB 커넥션 사용률이 급증하지 않는지 관측한다. 인프라 전환의 병목 후보를 분리하는 지표다.':
    'Watches that DB connection usage does not spike during deploy or scaling transitions. Isolates bottleneck candidates in infra changes.',
  'ALB target health, ECS running count, CloudWatch alarm 상태가 모두 정상이면 rolling deployment를 완료 상태로 본다.':
    'When ALB target health, ECS running count and CloudWatch alarm state are all normal, the rolling deployment counts as complete.',
  'ALB, ECS, CloudWatch, Sentry 연계값을 모듈 단위로 분리해 콘솔 수동 변경을 코드 리뷰 가능한 변경으로 바꾼다.':
    'Splits ALB, ECS, CloudWatch and Sentry settings into modules, turning manual console changes into code-reviewable changes.',
  '실제 apply 전에 생성·변경·삭제 리소스를 확인한다. 인프라 변경의 범위와 위험을 배포 전 검토 가능한 형태로 만든다.':
    'Checks resources to be created, changed or destroyed before the real apply, so the scope and risk of infra changes can be reviewed before deploy.',
  'ALB listener / target group 변경': 'ALB listener / target group changes',
  'ECS service desired count 변경': 'ECS service desired count change',
  'CloudWatch alarm 추가': 'CloudWatch alarm added',
  '동시 apply로 인프라 상태가 꼬이지 않도록 remote state와 lock을 둔다. 운영자가 콘솔에서 직접 만지는 흐름을 줄이고, 변경 이력을 코드와 state에 남긴다.':
    'Uses remote state and a lock so concurrent applies cannot corrupt infra state. Reduces direct console edits and keeps change history in code and state.',
  '검토된 plan을 AWS 리소스에 적용하고, ECS service가 stable 상태로 수렴할 때까지 배포 게이트와 관측 지표를 확인한다.':
    'Applies the reviewed plan to AWS resources and watches deploy gates and metrics until the ECS service converges to stable.',
  'PLAN → APPLY → STABILIZE → RECORDED 순서로 인프라 코드와 실제 리소스를 맞춘다.':
    'Aligns infra code and real resources in the order PLAN → APPLY → STABILIZE → RECORDED.',
  'ALB, Target Group, ECS Service, CloudWatch Alarm이 코드화된 기준선으로 생성·갱신된 결과 지점이다.':
    'The point where ALB, Target Group, ECS Service and CloudWatch Alarm are created or updated to the codified baseline.',
  '콘솔에서 생긴 수동 변경이나 예상 밖 리소스 차이를 drift로 격리한다. 바로 덮어쓰지 않고 plan 재검토 대상으로 올린다.':
    'Isolates manual console changes and unexpected resource differences as drift. Instead of overwriting them, they go back for plan review.',
  '인프라 모듈 버전과 변경 파일을 확인해 재현 가능한 배포 단위로 묶는다.':
    'Checks infra module versions and changed files and bundles them into reproducible deploy units.',
  '생성·변경·삭제 리소스 수와 영향 범위를 plan 단계에서 확인한다.':
    'Checks the number of created/changed/destroyed resources and the impact scope at the plan stage.',
  'apply 전에 state lock이 확보되었는지 확인해 동시 변경으로 인한 상태 불일치를 막는다.':
    'Confirms the state lock is held before apply, preventing state mismatches from concurrent changes.',
  'PLAN, APPLY, STABILIZE, RECORDED 상태를 순차적으로 표시한다. 화면의 움직임은 실제 로그가 아니라 작업 단계를 설명하는 도식이다.':
    'Shows the PLAN, APPLY, STABILIZE and RECORDED states in order. The motion is a diagram of the work steps, not real logs.',
  'Terraform으로 생성된 ECS/ALB 리소스에 CloudWatch metric과 alarm을 연결한다.':
    'Attaches CloudWatch metrics and alarms to the ECS/ALB resources created by Terraform.',
  '에러 추적 없음, 비용 가시성 없음, 수동 복구라는 빈 자리를 점선 고스트로 먼저 배치했다. 이후 CloudWatch와 Sentry가 그 자리를 채우는 구조다.':
    'The empty slots (no error tracking, no cost visibility, manual recovery) are drawn first as dashed ghosts. CloudWatch and Sentry then fill them.',
  '단일 EC2 장애 시 수동 복구, 배포 중 다운타임, 비용 가시성 부재, 에러 추적 불가.':
    'Manual recovery on single-EC2 failure, downtime during deploys, no cost visibility, no error tracking.',
  'ALB와 ECS에서 나오는 metric, log, alarm을 CloudWatch로 모은다. 비용과 장애 신호를 운영자가 볼 수 있는 표면으로 끌어올린다.':
    'Gathers metrics, logs and alarms from ALB and ECS into CloudWatch, bringing cost and failure signals to a surface operators can see.',
  'log retention과 alarm action': 'log retention and alarm actions',
  '로그 보존 기간을 코드로 관리해 비용 가시성 부재를 줄인다. 장기 보존이 필요한 신호와 단기 운영 로그를 분리하는 지점이다.':
    'Manages log retention in code to fix the lack of cost visibility. Separates signals that need long retention from short-lived ops logs.',
  '런타임 예외를 Sentry issue와 trace로 묶어 에러 추적 불가 상태를 해소한다. CloudWatch가 인프라 신호를 맡고, Sentry가 애플리케이션 예외 맥락을 보강한다.':
    'Groups runtime exceptions into Sentry issues and traces to end the lack of error tracking. CloudWatch covers infra signals; Sentry adds application exception context.',
  'CloudWatch alarm을 triage, runbook, rollback, verify 순서로 연결해 수동 복구를 기억 의존 작업이 아니라 절차화된 운영면으로 바꾼다.':
    'Chains CloudWatch alarms into triage, runbook, rollback and verify, turning manual recovery from memory-driven work into a defined procedure.',
  'alarm: 임계치 기반 감지': 'alarm: threshold-based detection',
  'triage: 영향 범위 확인': 'triage: check impact scope',
  'runbook/rollback: 복구 절차 실행': 'runbook/rollback: run recovery procedure',
  'verify: ALB/ECS/CloudWatch 상태 확인': 'verify: check ALB/ECS/CloudWatch state',
  'ALB/ECS metric과 log가 CloudWatch로 들어오는 경로를 표시한다. 샘플링 수치가 아니라 설계상 연결 지점을 보여주는 계측 버블이다.':
    'Shows the path ALB/ECS metrics and logs take into CloudWatch. This bubble marks a designed connection point, not sampled values.',
  'CloudWatch log retention 설정과 비용 가시성 확보 지점을 표시한다.':
    'Marks the CloudWatch log retention setting and where cost visibility is gained.',
})
