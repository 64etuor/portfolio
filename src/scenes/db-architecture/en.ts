import { registerSceneText } from '../_host/localize'

/** English projection of this scene's Korean copy (exact strings first, then word-level terms). */
registerSceneText({
  // ── header / tabs / footer ──
  'DB 모델링 & 데이터 아키텍처': 'DB Modelling & Data Architecture',
  '도메인 ERD': 'Domain ERD',
  '데이터 아키텍처': 'Data Architecture',
  '상태머신 · 재귀쿼리': 'State Machine · Recursive Query',
  'PostgreSQL · 정규화 MES 스키마': 'PostgreSQL · normalized MES schema',
  'PostgreSQL · BOM 정규화 스키마': 'PostgreSQL · normalized BOM schema',
  'MES 공정기술 · DB 아키텍처': 'MES process engineering · DB architecture',

  // ── ERD view ──
  'MES 공정 데이터 관리 스키마': 'MES process data schema',
  '공정·BOM·S/N·자재·검사 정규화': 'process·BOM·S/N·material·QC',
  'EBOM→MBOM 변환 엔진 스키마': 'EBOM→MBOM conversion engine schema',
  'PostgreSQL CTE · BOM 다단계 전개 · Make/Buy 분류': 'PostgreSQL CTE · BOM explosion · Make/Buy',
  '캔버스': 'canvas',
  '패닝 · scroll': 'to pan · scroll',
  '줌': 'to zoom',
  '테이블 -> DDL': 'table -> DDL',
  '예시 rows': 'sample rows',
  '예시 qps': 'sample qps',
  '예시 active tx': 'sample active tx',
  '예시 repl lag': 'sample repl lag',
  '예시': 'sample',
  // model captions (split around <b>/<code>)
  '엑셀 파편화 → PostgreSQL 기반': 'Fragmented Excel → a PostgreSQL-based',
  '정규화 관계형 DB': 'normalized relational DB',
  '. 26개 테이블로 작업지시·공정실적·BOM·S/N 계보·자재 lot·검사 이력을 분리하고, 1NF/2NF/3NF, PK/FK, partial index,':
    '. 26 tables separate work orders, process results, BOM, S/N genealogy, material lots and inspection history, designed consistently with 1NF/2NF/3NF, PK/FK, partial indexes and',
  '전개 쿼리까지 일관되게 설계.': 'explosion queries.',
  '로 구현한 EBOM→MBOM 변환 모델. 6개 테이블로 제품·BOM 헤더·계층 라인·부품 마스터·변환 이력을 분리하고, 다단계 BOM 전개':
    'EBOM→MBOM conversion model. 6 tables separate products, BOM headers, hierarchical lines, part master and conversion history, with multi-level BOM explosion',
  ', Make/Buy 분류(E / EP / SC), UNIQUE·partial index로 무결성 확보.':
    ', Make/Buy split (E / EP / SC), and integrity via UNIQUE and partial indexes.',

  // ── architecture view ──
  '공정 데이터': 'Process data',
  '수집 → 정규화 DB → Power BI': 'collection → normalized DB → Power BI',
  '파이프라인': 'pipeline',
  '엑셀 파편화(생산일보·공수·불량 각개 관리) 안티패턴을 제거.':
    'Removed the fragmented-Excel anti-pattern (daily reports, man-hours and defects each kept separately).',
  'PostgreSQL 정규화 DB': 'Normalized PostgreSQL DB',
  '(1NF/2NF/3NF)에 단일 입력하고, 자체개발 MES가 OPC UA 설비 데이터와 계층형 S/N 바코드를 연결 — Power BI에서 공수·생산현황·불량 리스크 범위를 투명하게 집계.':
    '(1NF/2NF/3NF) takes a single entry; our in-house MES links OPC UA equipment data with hierarchical S/N barcodes — Power BI aggregates man-hours, production status and defect risk scope transparently.',
  '엑셀 파편화': 'Fragmented Excel',
  ': 생산일보·공수·불량을 각기 다른 파일로 관리 — 집계 오류·중복·추적 불가.':
    ': daily reports, man-hours and defects in separate files — aggregation errors, duplicates, no traceability.',
  '정규화 설계 근거': 'Why normalized',
  '1NF/2NF/3NF 준수. PK/FK 명시, UNIQUE·partial index·CHECK 제약으로 중복과 상태 오류를 DB 레벨에서 차단.':
    '1NF/2NF/3NF compliant. Explicit PK/FK; UNIQUE, partial index and CHECK constraints block duplicates and invalid states at the DB level.',
  'S/N 추적성': 'S/N traceability',
  '시리얼 번호 기반 조회로': 'Serial-number lookups make the',
  '불량 리스크 범위': 'defect risk scope',
  '측정 가능. 필드 원자재 불량 재발 방지.': 'measurable. Prevents repeat field defects from raw materials.',
  '예시 변경 이벤트': 'Sample change events',
  '예시 -- evt/s': 'sample -- evt/s',
  'DB 입력': 'DB input',
  'OPC UA 수집': 'OPC UA collection',
  'PostgreSQL 저장': 'PostgreSQL storage',
  'Power BI 출력': 'Power BI output',
  // flow nodes
  'MES 입력 화면': 'MES input screen',
  '생산실적·불량·공수 입력': 'Output·defect·man-hour entry',
  '원천 DB 테이블': 'Source DB tables',
  '정규화 저장': 'Normalized store',
  '트랜잭션·제약·S/N 계보 저장': 'Transactions·constraints·S/N genealogy',
  '설비 태그 수집·정규화 변환': 'Equipment tag collection·normalization',
  'Power BI 데이터셋': 'Power BI dataset',
  '집계·KPI 모델': 'Aggregation·KPI model',
  '생산현황 뷰': 'Production status view',
  'W/O별 실적 대시보드': 'Output dashboard by W/O',
  '불량현황 뷰': 'Defect status view',
  '공정별 불량·S/N 추적': 'Defects·S/N tracking by process',
  'KPI 뷰': 'KPI view',
  '공수·OEE·생산성 분석': 'Man-hours·OEE·productivity',
  'x 엑셀 파편화': 'x Fragmented Excel',
  '파일별 분산 관리 - 집계 오류·중복': 'Scattered per-file data - aggregation errors·duplicates',
  // sample event stream fragments
  'Cell검사': 'Cell inspection',
  'UNIQUE 검증: component_no=BUSBAR-001 count=1 → OK': 'UNIQUE check: component_no=BUSBAR-001 count=1 → OK',
  'UNIQUE 검증': 'UNIQUE check',
  '음성 Cell': 'Eumseong Cell',

  // ── state machine / recursive view ──
  '상태머신': 'state machine',
  'BOM 다단계 전개': 'Multi-level BOM explosion',
  '분류': 'classification',
  '생산 시작': 'start production',
  '목표 달성': 'target met',
  '최종 확정': 'final sign-off',
  '자재 부족': 'material short',
  'W/O 취소': 'W/O cancelled',
  '자재 입고↺': 'material in↺',
  '재개↺': 'resume↺',
  '-- BOM 다단계 전개: anchor(루트 부품) + 재귀 멤버': '-- Multi-level BOM explosion: anchor (root part) + recursive member',
  '-- 알고리즘: expanded_qty(n) = expanded_qty(n-1) × qty_per': '-- Algorithm: expanded_qty(n) = expanded_qty(n-1) × qty_per',

  // ── DDL comments (MES model) ──
  '-- 고객사 마스터 (customer_key: 001 = Pacific Energy, 007 = ACE Power 등)':
    '-- Customer master (customer_key: 001 = Pacific Energy, 007 = ACE Power, etc.)',
  '-- 3NF: customer_name을 prod_raw에서 분리 — 부분 함수 종속 제거':
    '-- 3NF: customer_name split out of prod_raw — removes partial dependency',
  '-- 글로벌 거래처': '-- global accounts',
  '-- 실 데이터 예시: 001=Pacific Energy, 007=ACE Power Engineering, 009=ABB s.r.o.':
    '-- Real data sample: 001=Pacific Energy, 007=ACE Power Engineering, 009=ABB s.r.o.',
  '-- 제품 마스터 (product_key: MM001~MM010, SR001~SR005, SC001~SC004 등)':
    '-- Product master (product_key: MM001~MM010, SR001~SR005, SC001~SC004, etc.)',
  '-- EBOM 버전별 분리: 논산 Cell(Ver.1) / 음성 Cell(Ver.2) 등':
    '-- EBOM split by version: Nonsan Cell (Ver.1) / Eumseong Cell (Ver.2), etc.',
  '-- 복합 인덱스: 라인·타입 기준 필터': '-- Composite index: filter by line and type',
  '-- 수주(P/O) 헤더 — prod_raw의 P/ONo 컬럼 정규화': '-- Purchase order (P/O) header — normalizes the P/ONo column of prod_raw',
  '-- 예: 23P30073=충주호 소방정, 23P30027=RED project': '-- e.g. 23P30073=Chungjuho fireboat, 23P30027=RED project',
  '-- 고객사별 수주 조회': '-- Orders by customer',
  '-- 작업지시(W/O) — prod_raw의 W/ONo 컬럼 정규화': '-- Work order (W/O) — normalizes the W/ONo column of prod_raw',
  '-- 예: 23P30073KMDL2 → PO 23P30073, 제품 KMD255151E220L2': '-- e.g. 23P30073KMDL2 → PO 23P30073, product KMD255151E220L2',
  '-- W/O별 누적 실적 조회': '-- Cumulative output by W/O',
  '-- 공정별 생산실적 (prod_raw 원본 — 정규화 후 팩트 테이블)':
    '-- Output by process (from prod_raw — fact table after normalization)',
  '-- 공정: Cell검사 / Module적층 / Module조립 / ELT / 포장 등':
    '-- Processes: Cell inspection / Module stacking / Module assembly / ELT / packing, etc.',
  "'주간'": "'day'",
  "'야간'": "'night'",
  "-- 'Cell검사','Module적층','포장'...": "-- 'Cell inspection','Module stacking','packing'...",
  '-- 투입 공수(분)': '-- input man-hours (min)',
  '-- 손실 공수(분)': '-- lost man-hours (min)',
  '-- 손실 사유': '-- loss reason',
  '-- 일자별 W/O별 집계 인덱스': '-- Aggregation index by date and W/O',
  '-- BIGSERIAL PK: UNIQUE 제약 중복 차단 대체': '-- BIGSERIAL PK: replaces UNIQUE-based duplicate blocking',
  '-- 일별 인원·공수 원장 (att_raw 정규화 — 3NF)': '-- Daily headcount/man-hour ledger (att_raw normalized — 3NF)',
  '-- 직접직/연장/휴게/계획정지/자재관리 분 단위 기록':
    '-- Direct labor/overtime/break/planned stop/material handling, in minutes',
  '-- 직접직 인원수': '-- direct labor headcount',
  '-- 연장(분)': '-- overtime (min)',
  '-- 휴게시간(분)': '-- break time (min)',
  '-- 계획정지(분)': '-- planned stop (min)',
  '-- 자재관리(분)': '-- material handling (min)',
  '-- 라인·날짜 복합 인덱스 (Power BI 집계 가속)': '-- Line + date composite index (speeds up Power BI aggregation)',
  '-- 불량 이력 (공정별 불량 S/N 및 유형 기록)': '-- Defect history (defective S/N and type per process)',
  '-- S/N 기반 추적성: 필드 원자재 불량 리스크 범위 측정 가능':
    '-- S/N traceability: field raw-material defect risk scope is measurable',
  '-- 시리얼 번호 (추적성)': '-- serial number (traceability)',
  '-- S/N 조회: 이력 추적 인덱스': '-- S/N lookup: history tracking index',
  '-- 불량 유형 코드 마스터 (2NF: defect_history에서 분리)': '-- Defect type code master (2NF: split from defect_history)',
  '-- 예: DC01=Cell 극성 불량, DA01=외관 스크래치, DV01=전압 이상':
    '-- e.g. DC01=Cell polarity defect, DA01=surface scratch, DV01=voltage fault',
  '-- 해당 공정명': '-- process name',
  '-- 검사 실적 (공정별 검사 결과 — Cell검사 / ELT 등)': '-- Inspection results per process (Cell inspection / ELT, etc.)',
  '-- SN 기반 상위 공정 경로 검증: 미등록 제품 투입 차단':
    '-- SN-based upstream route check: blocks unregistered products',
  '-- 부품/제품 시리얼 번호': '-- part/product serial number',
  "-- 'OCV/IR','ELT','포장'...": "-- 'OCV/IR','ELT','packing'...",
  '-- 작업자명': '-- operator name',
  '-- S/N × 공정 복합 인덱스 (경로 검증 쿼리)': '-- S/N × process composite index (route check query)',
  '-- BOM 헤더 (EBOM / MBOM 분리 관리)': '-- BOM header (EBOM / MBOM kept separate)',
  '-- EBOM: Engineering BOM, MBOM: Manufacturing BOM (PostgreSQL 변환 함수 출력)':
    '-- EBOM: Engineering BOM, MBOM: Manufacturing BOM (output of a PostgreSQL conversion function)',
  '-- 제품·타입 복합 인덱스': '-- Product + type composite index',
  '-- BOM 라인 (자기참조 계층 — 다단계 BOM 전개)': '-- BOM line (self-referencing hierarchy — multi-level BOM explosion)',
  '-- PostgreSQL 재귀 CTE 전개 알고리즘: levels(n) = levels(n-1) * qty_per':
    '-- PostgreSQL recursive CTE explosion: levels(n) = levels(n-1) * qty_per',
  '-- NULL = 최상위': '-- NULL = top level',
  '-- WITH RECURSIVE BOM 전개: parent_id 인덱스': '-- WITH RECURSIVE BOM explosion: parent_id index',
  '-- 루트 부품 partial index': '-- root part partial index',
  '-- 공정 마스터: 공정명을 팩트 테이블에서 분리해 명칭 드리프트 차단':
    '-- Process master: process names split from fact tables to stop naming drift',
  '-- 제품별 표준 라우팅. 작업지시는 이 라우팅으로 공정 순서를 검증':
    '-- Standard routing per product. Work orders validate process order against it',
  '-- 작업장/스테이션 마스터: 설비와 실적의 공정 귀속 기준':
    '-- Workstation master: assigns equipment and output to processes',
  '-- 자체개발 MES 연동 설비. OPC UA node/tag로 공정 데이터를 수집':
    '-- Equipment linked to the in-house MES. Collects process data via OPC UA node/tag',
  '-- 작업자 마스터: 실적·검사·재작업 기록의 책임 주체':
    '-- Operator master: owner of output, inspection and rework records',
  '-- 공급사 마스터: 자재 lot 추적과 불량 리스크 역추적의 기준':
    '-- Supplier master: basis for material lot tracking and defect risk back-tracing',
  '-- 자재 마스터: BOM component_no와 구매/재고 속성을 분리':
    '-- Material master: separates BOM component_no from purchasing/stock attributes',
  '-- 입고 lot 원장: 자재 불량 발생 시 사용 W/O와 S/N 범위를 역추적':
    '-- Receiving lot ledger: back-traces the W/Os and S/N range used when a material defect occurs',
  '-- W/O별 자재 투입. S/N genealogy와 lot 리스크 범위 계산의 연결 테이블':
    '-- Material issue per W/O. Link table for S/N genealogy and lot risk scope',
  '-- 계층형 S/N 바코드 원장: Cell → Module → Rack/Pack 추적':
    '-- Hierarchical S/N barcode ledger: Cell → Module → Rack/Pack tracking',
  '-- S/N 계보: 완제품에서 하위 모듈·자재 lot까지 내려가는 추적 경로':
    '-- S/N genealogy: trace path from finished product down to modules and material lots',
  '-- 검사 측정값: OCV/IR/ELT 등 수치 데이터를 result 헤더에서 분리':
    '-- Inspection measurements: OCV/IR/ELT values split from the result header',
  '-- 재작업 조치 이력: 불량 발생-조치-재검사 사이클을 별도 엔티티로 관리':
    '-- Rework history: defect → action → re-inspection cycle as its own entity',
  '-- 출하 헤더: 고객/P.O. 단위 출하 상태 관리': '-- Shipment header: shipment status per customer/P.O.',
  '-- 출하 S/N 라인: 출고 후 필드 클레임에서 제조/자재 이력까지 역추적':
    '-- Shipment S/N line: back-traces field claims to manufacturing/material history',

  // ── DDL comments (EBOM model) ──
  '-- 제품 마스터 (EBOM 변환 대상 제품 목록)': '-- Product master (products to convert from EBOM)',
  '-- BOM 헤더 (EBOM/MBOM 분리 버전 관리)': '-- BOM header (separate EBOM/MBOM versions)',
  '-- BOM 라인 (자기참조 계층 구조)': '-- BOM line (self-referencing hierarchy)',
  '-- 전개 공식: expanded_qty(n) = expanded_qty(n-1) × qty_per': '-- Explosion formula: expanded_qty(n) = expanded_qty(n-1) × qty_per',
  '-- make_buy: E=Engineering(설계), EP=Purchased(구매), SC=Sub-Contract':
    '-- make_buy: E=Engineering, EP=Purchased, SC=Sub-Contract',
  '-- WITH RECURSIVE BOM 다단계 전개': '-- WITH RECURSIVE multi-level BOM explosion',
  '-- 부품 마스터 (3NF: bom_line에서 부품 속성 분리)': '-- Part master (3NF: part attributes split from bom_line)',
  '-- spec_json: 전압·용량·규격 등 가변 속성': '-- spec_json: variable attributes such as voltage, capacity, spec',
  '-- EBOM→MBOM 변환 이력 로그 (PostgreSQL 변환 함수 실행 기록)':
    '-- EBOM→MBOM conversion log (PostgreSQL conversion function runs)',
  '-- 실행자': '-- run by',
  '-- 변환 알고리즘: expanded_qty = levels(n-1) * qty_per': '-- Conversion algorithm: expanded_qty = levels(n-1) * qty_per',
  '-- 중복 방지: UNIQUE(src_bom_id, dst_bom_id, component_no)로 차단':
    '-- Duplicate guard: blocked by UNIQUE(src_bom_id, dst_bom_id, component_no)',
  '-- 중복 부품 검증 테이블 (UNIQUE 제약 위반 후보를 검토 큐로 적재)':
    '-- Duplicate part check table (queues UNIQUE violation candidates for review)',
  '-- 중복 조회 partial index': '-- duplicate lookup partial index',
})
