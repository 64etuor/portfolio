// English projection of the gantt-cpm career canon (data.ts). Korean stays the
// source of truth for every number, date, and color; this file only supplies
// English copy keyed by row id, plus the static board chrome.

import type { Locale } from '@/i18n/content'
import { COMPANIES, DERIVED, KPIS, MILES, PROJECTS, SKILLS, type Derived, type Kpi, type Milestone, type Row, type SkillGroup } from './data'

type M = [k: string, v: string, c: string]
type RowEn = { co: string; role: string; problem: string; built: string; desc: string; metrics: M[]; stack: string[] }

const ROW_EN: Record<string, RowEn> = {
  eun: {
    co: 'Eunsung SIT',
    role: 'Production Control Manager · Battery-pack Production Lead',
    problem: 'The battery-pack floor ran without capacity, labor, or inventory data; operating cost and outgoing defects were out of control.',
    built: 'Redesigned the line operating structure and renegotiated procurement prices to cut operating cost by 85%, and introduced vision inspection to bring outgoing quality to zero defects.',
    desc: 'Led production operations and control for battery packs, purifier components, and automotive wiring harnesses. Analyzed manufacturing and operating cost from capacity, labor, material, and inventory flows; cut operating cost through price renegotiation and line redesign; stabilized outgoing quality with vision inspection; ran SQ, ISO, and IATF 16949 systems.',
    metrics: [['Operating cost', '−85%', 'Line operating redesign'], ['Procurement', 'Renegotiated', 'Better supply-price margin'], ['Field defects', '0', 'After vision inspection'], ['Quality system', 'IATF16949', 'SQ · ISO · automotive standard']],
    stack: ['PFMEA', 'CP/PFD', 'SOP', 'Vision inspection', 'IATF16949', 'Ecount ERP'],
  },
  elen: {
    co: 'Elentec',
    role: 'Production-line PM · Team Lead',
    problem: 'Ultrasonic-welding defects (15%) and a neck-process bottleneck dragged down line productivity, and LOB imbalance made downtime chronic.',
    built: 'Optimized welding conditions with DOE, designed and built cutting and inspection jigs to cut cycle time by 49%, and rebalanced the line for a 24% productivity gain.',
    desc: 'As production-line PM, analyzed capacity, LOB, and cycle time to raise productivity. Fixed spot, laser, and ultrasonic welding defects at the root with DOE, built jigs to shorten cycle time, and ran an SCM improvement with the Samsung partnership academy.',
    metrics: [['C/T', '−49%', 'Jig development · process layout'], ['Productivity (LOB)', '+24%', 'Line balancing'], ['Weld defects', '15→0%', 'DOE condition optimization'], ['Equipment', 'Jig development', 'Mechanical design · robot teaching']],
    stack: ['DOE', 'LOB', 'C/T', 'Jig development', 'Mechanical design', 'Industrial welding', 'Robot teaching'],
  },
  sol: {
    co: 'SolarEdge',
    role: 'Process Engineer',
    problem: 'Production, defect, and standard-time data were scattered across individual Excel files, wasting 451 minutes a day on reporting; without S/N traceability, field-defect risk could not be scoped.',
    built: 'Built an integrated DB dashboard and automated inspection-report pipeline with Excel VBA, SQL, and Power BI, then an S/N traceability system with Power Apps and Power Automate, and an in-house MES.',
    desc: 'Collected and cleansed production, defect, KPI, BOM, standard-time, work-order, and OPEX data into databases and dashboards. Built automated inspection reports, S/N traceability, and MES operations for a new product line — the turn from process engineering to data engineering.',
    metrics: [['Office hours', '−451 min/day', 'DB integration · auto reports'], ['ST (setup)', '−50%', 'Normalized on real data'], ['Traceability', 'S/N-based', 'Field risk made measurable'], ['Systems', 'MES · DB', 'Process data integration']],
    stack: ['Excel VBA', 'Python', 'SQL', 'Power BI', 'Power Apps', 'MES'],
  },
  bridge: {
    co: 'Upskilling',
    role: 'Data engineering · software development · applied AI',
    problem: 'Deep manufacturing domain experience, but not yet the engineering skills to implement and ship solutions in code and models.',
    built: 'Completed the Metacode data-analytics bootcamp (Python, SQL, ML) and the Hanwha Systems Beyond SW bootcamp (React, FastAPI, DevOps) over nine months to build full-stack skills.',
    desc: 'A deliberate learning period to add data engineering, software development, and applied-AI skills on top of the manufacturing domain: the Metacode data-analytics bootcamp (2024.11–2025.04, started while at SolarEdge) and the Hanwha Systems Beyond SW bootcamp (2025.01–2025.07).',
    metrics: [['Bootcamps', '2 completed', 'Data analytics · Beyond SW'], ['Focus', 'Data · SW · AI', 'Professional skills'], ['Stack', 'Full-Stack', 'React · FastAPI · ML'], ['Duration', '9 months', 'Data analytics → SW']],
    stack: ['Python', 'SQL', 'BI', 'ML', 'React', 'FastAPI', 'DevOps'],
  },
  mir: {
    co: 'Startup',
    role: 'Head of Operations / Director',
    problem: 'Beauty-store operations were not digitized: customer management, sales tracking, and team operations were manual and scattered, and product, infrastructure, and the team OS all had to be built from scratch.',
    built: 'Designed and built the FastAPI backend, RDS MySQL, and ECS Fargate infrastructure, and led the whole product line — CRM, kiosk app, Notion team OS, RPA, and AI/MCP automation.',
    desc: 'Leads the beauty-retail product suite (CRM, kiosk, collaboration software, app). Builds and runs the FastAPI backend, RDS MySQL, AWS/GCP infrastructure, and CI/CD, and moves team workflows to RPA and AI (MCP) automation.',
    metrics: [['Products', 'CRM · kiosk · app', 'End-to-end ownership'], ['Infrastructure', 'AWS · GCP · CI/CD', 'Full-stack cloud'], ['Backend', 'FastAPI · RDS', 'Service architecture'], ['Transformation', 'RPA · AI MCP AX', 'Workflow automation']],
    stack: ['FastAPI', 'React', 'TypeScript', 'Electron', 'Rust', 'AWS', 'GCP', 'RPA', 'AI MCP', 'CI/CD'],
  },
  'p-vision': {
    co: 'Eunsung · Project',
    role: 'Automated Vision Inspection',
    problem: 'Missing inserts and nuts in molded parts and reversed battery modules were hard to catch by eye and risked reaching the field.',
    built: 'Introduced and configured vision inspection on uncovered processes for automatic appearance, dimension, and reversal checks, bringing outgoing defects to zero.',
    desc: 'Automated battery-pack appearance and dimension checks with vision inspection, adding it to processes with missing inserts, missing nuts, and reversed-module risks; outgoing defects fell to zero.',
    metrics: [['Field defects', '0', 'Outgoing · field'], ['Inspection', 'Automated', 'Appearance · dimension · reversal']],
    stack: ['Vision inspection', 'PFMEA', 'CP'],
  },
  'p-smartfac': {
    co: 'Eunsung · Project',
    role: 'Smart Factory Introduction (SME Agency)',
    problem: 'Inventory and output data lived in handwritten ledgers, delaying status checks and repeating data errors.',
    built: 'Applied for and delivered a government smart-factory program: Ecount ERP, ERP-linked barcode control, and tablet-based production status.',
    desc: 'Applied for and ran the SME agency’s smart-factory starter program. Digitized operating data and standardized procedures with Ecount ERP, ERP-linked barcode management, and tablet-based production status.',
    metrics: [['ERP', 'Ecount', 'Company-wide digitization'], ['Logistics', 'Barcode-linked', 'Inventory · error prevention'], ['Shop floor', 'Tablet status', 'Manual lines']],
    stack: ['Ecount ERP', 'Barcode', 'Mobile tablets', 'MES'],
  },
  'p-sparta': {
    co: 'Bootcamp · Learning',
    role: 'Sparta Coding Club App & Web Course',
    problem: 'I was already building Excel and automation tools on the floor, but without formal development basics the scope hit a ceiling.',
    built: 'Completed an app and web development course covering implementation, database integration, and deployment.',
    desc: 'An app and web development course taken in 2022.01–2022.02 while at Eunsung — implementation, database integration, and deployment. My first formal coding study, connecting shop-floor tool building to real development foundations.',
    metrics: [['Period', '2022.01–02', 'While at Eunsung'], ['Topics', 'App · web · DB · deploy', 'Intro to coding']],
    stack: ['App development', 'Web development', 'DB integration', 'Deployment'],
  },
  'p-line': {
    co: 'Elentec · Project',
    role: 'Annual Production-line Innovation',
    problem: 'Ultrasonic-welding defects (15%) scrapped large volumes of molded cases, while a neck-process bottleneck and LOB imbalance dragged down the line.',
    built: 'Optimized welding with DOE, designed cutting and inspection jigs (C/T −49%), and rebalanced the line (+24% productivity), saving ₩68M a year in scrap and rework.',
    desc: 'Started from scrapped molded cases caused by ultrasonic-welding defects and grew into several tracks: welding DOE took defects from 15% to under 1%, a cutting jig cut neck-process C/T by 24%, a modified test jig cut core-pack function-test C/T by 49%, and small-pack LOB work raised productivity by 24%.',
    metrics: [['Weld defects', '15→0%', 'DOE condition optimization'], ['C/T (core)', '−49%', 'Test-jig rework 55→28 s'], ['Productivity', '+24%', 'Small-pack LOB'], ['Scrap · rework', '−₩68M/yr', 'Scrap ₩36M + rework ₩32M']],
    stack: ['DOE', 'LOB', 'C/T', 'Jig development', 'Ultrasonic welding', 'Python', 'WBS/Gantt'],
  },
  'p-idle': {
    co: 'Elentec · Project',
    role: 'Idle Equipment Reuse',
    problem: 'Four vision-inspection machines (about ₩40M each) sat idle awaiting disposal while new equipment purchases were planned.',
    built: 'Planned their reuse: one became a semi-automatic medical-kit assembly station, and two were redeployed with general-purpose vision software for insert, nut, and reversal checks.',
    desc: 'Found new uses for four idle vision-inspection machines (about ₩40M each). One was converted into semi-automatic medical-kit assembly equipment; two run general-purpose vision software to catch missing inserts and nuts and prevent reversed battery modules.',
    metrics: [['Savings', '≈₩4M', 'Against quoted price'], ['Equipment', '4 repurposed', 'Reused instead of scrapped']],
    stack: ['Vision inspection', 'Equipment reuse', 'Quality automation'],
  },
  'p-samsung': {
    co: 'Samsung Academy · Project',
    role: 'Samsung Manufacturing Leaders — Logistics Improvement',
    problem: 'Inventory transfers between manufacturing and sales were not digitized, so inventory accuracy was low and over- and under-stock kept recurring.',
    built: 'Formed a four-function task force (purchasing, sales, manufacturing, production control), led it for three months, and redesigned liability zones and the transfer process — inventory turnover +17%.',
    desc: 'Part of the Samsung Electronics partnership academy’s manufacturing-leader program. With Samsung mentoring, led a cross-functional task force for three months, defining liability zones and digitizing manufacturing-to-sales inventory transfers.',
    metrics: [['Inventory turnover', '+17%', 'Project KPI'], ['Task force', '4 functions', 'Purchasing · sales · mfg · control']],
    stack: ['SCM', 'Inventory management', '3S/5S', 'Process improvement', 'PM'],
  },
  'p-procdata': {
    co: 'SolarEdge · Project',
    role: 'Process Data Management System',
    problem: 'Work orders, plans, output, and defects were split across Excel files, wasting 451 minutes a day on reporting, and product ST could not be measured from real data.',
    built: 'Built a DB pipeline with Excel VBA, SQL, and Power BI, auto-refresh through an on-prem gateway, an integrated dashboard, and scripted reports — saving 451 min/day (≈₩50M/yr) and cutting product ST by 50%.',
    desc: 'Moved file-by-file Excel management to a database. Stored work orders, plans, output, and defects in a DB with input validation, on-prem gateway refresh, a Power BI dashboard, and scripted report generation. Office work fell by 451 min/day (≈₩50M/yr) and product ST by 50%.',
    metrics: [['Office hours', '−451 min/day', '≈₩50M per year'], ['Product ST', '−50%', 'Based on real data'], ['Data', 'DB integration', 'Validation · automation'], ['Award', 'MOC Best', '2023 Employee of the Year']],
    stack: ['Excel VBA', 'SQL', 'Power BI', 'On-prem Gateway', 'Script automation'],
  },
  'p-trace': {
    co: 'SolarEdge · Project',
    role: 'Process Traceability Program',
    problem: 'A raw-material defect surfaced in the field, but handwritten S/N records made it impossible to scope the impact or a recall.',
    built: 'Designed and built Power Apps mobile output entry and checklists, S/N validation and mix-up prevention, a Power BI trace dashboard, and Power Automate inspection reports.',
    desc: 'Started from a field raw-material defect that handwritten S/N records could not scope. Added Power Apps mobile entry and checklists, S/N validation and part mix-up prevention, Power BI tracing, and automated inspection reports with Power Automate.',
    metrics: [['Traceability', 'S/N-based', 'Risk scope made measurable'], ['Quality gate', 'Mix-up prevention', 'Blocks unregistered units'], ['Award', 'Core Value', '2024 Core Value Award']],
    stack: ['Power Apps', 'Power BI', 'Power Automate', 'S/N tracking'],
  },
  'p-dv': {
    co: 'SolarEdge · Project',
    role: 'DV Data Management',
    problem: 'There was no way to gather multi-site data in real time during a short DV window, making quality data and status hard to obtain.',
    built: 'Planned and built a Google AppSheet output and defect app, Python Matplotlib CPK analysis, a live Sheets dashboard, and Apps Script QR history tracking.',
    desc: 'Planned to capture more high-quality data in a limited Design Validation window and see multi-site status live. Built an AppSheet entry app, Python CPK analysis, a live Sheets dashboard, and QR history tracking (an EU battery-passport trial).',
    metrics: [['DV data', 'More captured', 'Quality data in a short window'], ['Status', 'Real-time', 'Multi-site DV visibility'], ['Tracking', 'QR history', 'Battery-passport ready']],
    stack: ['AppSheet', 'Python', 'Matplotlib', 'Sheets', 'Apps Script', 'CPK'],
  },
  'p-mes': {
    co: 'SolarEdge · Project',
    role: 'New Line Setup — In-house MES',
    problem: 'During a new-line transfer, equipment was $300K over budget and the MES outsourcing cost had been left out — MES had to be secured without a vendor.',
    built: 'Planned, designed, and built a full-stack MES: Django REST backend, React and Electron front ends, OPC UA and TCP/IP ETL, PostgreSQL, and a Python Dash dashboard (halted when the business closed).',
    desc: 'While setting up a product line transferred to Korea, found the MES budget missing from an already-overrun equipment budget and led an in-house build: Django REST, React and Electron, OPC UA and TCP/IP ETL, PostgreSQL, and a live Dash dashboard (halted when the business closed).',
    metrics: [['MES', 'In-house', 'Replaced missing vendor budget'], ['Full stack', 'Django · React', 'Electron · Dash'], ['ETL', 'OPC UA', 'Equipment and vision data']],
    stack: ['Python', 'Django', 'React', 'TypeScript', 'Electron', 'PostgreSQL', 'OPC UA'],
  },
  'p-metacode': {
    co: 'Bootcamp · Learning',
    role: 'Metacode Data Analytics Bootcamp',
    problem: 'I had worked with process data on the floor but lacked formal analysis and modelling skills in Python, SQL, and ML.',
    built: 'Completed the Metacode data-analytics bootcamp (2024.11–2025.04), studying Python, SQL, BI, and machine learning.',
    desc: 'A data-analytics course from 2024.11 to 2025.04, started while at SolarEdge. Python, SQL, BI, and machine learning turned hands-on process-data work into formal analysis and modelling skills.',
    metrics: [['Period', '2024.11–25.04', 'Started while at SolarEdge'], ['Topics', 'Python · SQL · BI · ML', 'Analysis · modelling']],
    stack: ['Python', 'SQL', 'BI', 'Machine learning'],
  },
  'p-hanwha': {
    co: 'Bootcamp · Learning',
    role: 'Hanwha Systems Beyond SW Bootcamp',
    problem: 'With analytics skills in place, I still needed full-stack skills to implement and ship solutions myself.',
    built: 'Completed the Hanwha Systems Beyond SW bootcamp (2025.01–2025.07), covering back end, front end, and DevOps.',
    desc: 'A software-development course from 2025.01 to 2025.07 covering back end, front end, and DevOps — the full-stack skills to implement and deploy field solutions in code.',
    metrics: [['Period', '2025.01–25.07', 'After the analytics course'], ['Topics', 'Back/Front · DevOps', 'Full-stack build · deploy']],
    stack: ['React', 'TypeScript', 'FastAPI', 'DevOps', 'CI/CD'],
  },
  'p-notion': {
    co: 'Startup · Team OS',
    role: 'Notion OS — Organizational Operating System',
    problem: 'Documents, decisions, goals, delivery, and operating knowledge were scattered, so the team had no single source of truth and execution had friction.',
    built: 'Planned, designed, and built a Notion-based operating system on my own — SSOT governance, backlog, PRDs, Decision OS, OKRs, runbooks, and GitHub integration — and keep running and refining it.',
    desc: 'A Notion-centred operating system connecting documents, decisions, goals, delivery, and operating knowledge, built and maintained single-handedly: SSOT governance, a development-docs hub, a Jira-replacement backlog with epics and PRDs, Decision OS (ledger, actions, boost/drag), OKR/KPI check-ins, operations and security runbooks, GitHub/Drive/AI integration, and Google Workspace setup.',
    metrics: [['Design', '7 subsystems', 'Docs · backlog · PRD · decisions · OKR · runbooks · integrations'], ['Principle', 'SSOT', 'Canonical homes · document lifecycle'], ['Operation', 'Ongoing', 'Built and refined solo']],
    stack: ['Notion', 'Decision OS', 'OKR', 'SSOT', 'Google Workspace', 'GitHub integration'],
  },
  'p-backend': {
    co: 'Startup · Backend',
    role: 'Backend — FastAPI · SQLAlchemy',
    problem: 'The product suite needed business APIs, auth, persistence, and async workers built from scratch, with operational safety and safe migrations.',
    built: 'Designed and built the backend with FastAPI, SQLAlchemy, and Alembic, including RDS MySQL data modelling, an async job framework, and runtime secret management.',
    desc: 'A FastAPI, SQLAlchemy, and Alembic backend for business APIs, persistence, auth, and background workers. Designed RDS MySQL models, migration safety, an async external-API job framework, and runtime secrets.',
    metrics: [['Stack', 'FastAPI', 'SQLAlchemy · Alembic'], ['Data', 'RDS MySQL', 'Modelling · migrations'], ['Workers', 'Background', 'Scheduler · async jobs']],
    stack: ['FastAPI', 'SQLAlchemy', 'Alembic', 'MySQL', 'RDS', 'SSM'],
  },
  'p-crm': {
    co: 'Startup · CRM',
    role: 'CRM — React',
    problem: 'Store operators had no single tool for sales and customer data, so decisions were slow and error-prone.',
    built: 'Built the CRM workflow UI with Vite, React, and TypeScript, with sales and customer dashboards, trace-id error handling, reliable polling, and a user manual.',
    desc: 'A CRM workflow UI for store operators to manage sales and customers, built with Vite, React, and TypeScript — statistics dashboards, error handling with trace ids, polling reliability, and a user manual.',
    metrics: [['Stack', 'React · Vite · TS', 'CRM workflow UI'], ['Feature', 'Stats dashboard', 'Sales · customer statistics'], ['Operations', 'Trace · polling', 'Error handling · observability']],
    stack: ['React', 'Vite', 'TypeScript', 'TanStack Query'],
  },
  'p-kiosk-app': {
    co: 'Startup · Kiosk',
    role: 'Kiosk App — Electron · React',
    problem: 'Stores needed an in-store kiosk app, with device, camera, and media integration and a secure IPC boundary designed from scratch.',
    built: 'Built the kiosk app with Electron, React, and TypeScript, designing the renderer/main/preload IPC boundary, camera and media workflows, and device diagnostics.',
    desc: 'An in-store kiosk application built with Electron, React, and TypeScript: device and media workflows, the renderer/main/preload IPC boundary, and camera and diagnostics integration.',
    metrics: [['Stack', 'Electron · React', 'Kiosk app'], ['Boundary', 'IPC layer', 'main · preload · renderer'], ['Integration', 'Devices · media', 'Camera · diagnostics']],
    stack: ['Electron', 'React', 'TypeScript', 'IPC'],
  },
  'p-kiosk-hw': {
    co: 'Startup · Hardware',
    role: 'Kiosk Hardware Prototype',
    problem: 'No off-the-shelf kiosk fit beauty-store conditions, so a prototype had to be planned and built in-house.',
    built: 'Planned and designed the kiosk hardware prototype, managed outsourced fabrication, and reviewed usability and installation in stores.',
    desc: 'Planned and mechanically designed a kiosk hardware prototype for beauty stores, managed outsourced fabrication, and reviewed usability and installation conditions on site.',
    metrics: [['Design', 'Mechanical prototype', 'Kiosk hardware'], ['Management', 'Outsourced build', 'Fabrication · operations review']],
    stack: ['Mechanical design', 'Hardware prototyping', 'Vendor management'],
  },
  'p-infra': {
    co: 'Startup · Infrastructure',
    role: 'Infrastructure & Monitoring — ECS · Terraform · Observability',
    problem: 'The backend ran on a single EC2 instance: failures needed manual recovery, deployments caused downtime, and there was no cost visibility or error tracking.',
    built: 'Designed and built the full infrastructure and monitoring stack — ECS Fargate Multi-AZ, Terraform, ALB, ECR, SSM, Sentry, CloudWatch — for zero-downtime rolling deploys, automatic failover, and budget alarms.',
    desc: 'Moved the backend from a single EC2 instance to ECS Fargate across availability zones for zero-downtime rolling deploys, failover, and self-healing. Load balancing, container registry, runtime secrets, search, error tracking, logs, metrics, and budget alarms are all codified in Terraform.',
    metrics: [['Runtime', 'ECS Fargate', 'Multi-AZ zero-downtime deploys'], ['IaC', 'Terraform', 'Modules · environments'], ['Monitoring', 'Observability', 'Errors · logs · metrics · alarms'], ['Services', 'Load balancing · registry', 'Secrets · search']],
    stack: ['AWS ECS Fargate', 'ALB', 'ECR', 'Terraform', 'SSM', 'Sentry', 'CloudWatch', 'Firebase'],
  },
  'p-radar': {
    co: 'Independent Project',
    role: 'Work Radar — Local-first AI Workflow Cockpit',
    problem: 'Calendar, pull requests, backlog, worktrees, and agent sessions lived in separate apps, so deciding what to do now was expensive.',
    built: 'Designed and built an 11-surface local-first AI cockpit (Capture, Timeline, Control Room, and more) in Tauri and Rust, with two-way Google Calendar sync, an MCP human gate, and bounded agent runs (timeout, cost cap, kill).',
    desc: 'A local-first AI cockpit that brings calendar, PRs, backlog, worktrees, and agent sessions into one desktop view. Eleven surfaces, two-way Google Calendar sync, a human-gated MCP gateway, and bounded agent execution, built with Tauri and Rust.',
    metrics: [['Surfaces', '11 unified', 'Capture · schedule · jobs · governance'], ['Run control', 'Bounded', 'Timeout · cost cap · kill'], ['Safety', 'Human gate', 'External writes behind a Rust boundary']],
    stack: ['Tauri 2', 'Rust', 'SQLite', 'React', 'TypeScript', 'MCP', 'Calendar API'],
  },
  'p-kip': {
    co: 'Independent Project',
    role: 'KIP — Evidence-first Knowledge Fabric Starter Kit',
    problem: 'Knowledge was scattered across NAS shares, HWP files, scanned PDFs, slides, and chat; a RAG answer is useless at work if its source cannot be checked.',
    built: 'One indexing and retrieval service behind CLI (versioned JSON), REST/OpenAPI, and MCP with identical semantics. Every answer carries a source locator; a hybrid PDF backend made parsing 19.2× and sync 3.23× faster while lexical Recall@10 stayed at 1.0000.',
    desc: 'An agent-first knowledge fabric that always returns the source location behind each answer. Semantic search stays off until evaluation proves it beats lexical search, and goals and implementation status are documented separately to prevent overclaiming.',
    metrics: [['Entry points', 'CLI · REST · MCP', 'One retrieval service'], ['Parsing', '19.2x', '6 public PDFs · sync 3.23x'], ['Retrieval', 'Recall@10 1.0', 'MRR 0.9861 · zero ACL leaks']],
    stack: ['Python 3.12', 'PostgreSQL 18', 'FastAPI', 'Typer', 'MCP', 'Docker'],
  },
}

const MILES_EN = ['IATF16949 · operating cost −85%', 'Productivity +24% · C/T −49%', 'Core Value Award · ST −50%', 'Data integration · MOC Best', 'Data · SW · AI upskilling complete']

const KPIS_EN: Pick<Kpi, 'cat' | 'u' | 'nm' | 'delta'>[] = [
  { cat: 'Eunsung · operating cost', u: '%', nm: 'Line operating redesign', delta: 'Manufacturing cost · OPEX analysis' },
  { cat: 'Elentec · process C/T', u: '%', nm: 'Jigs · LOB improvement', delta: 'With productivity +24%' },
  { cat: 'SolarEdge · office hours', u: 'min/day', nm: 'DB integration · auto reports', delta: '≈₩50M per year' },
  { cat: 'Samsung · inventory turnover', u: '%', nm: 'SCM · inventory transfer', delta: 'Project KPI' },
]

const DERIVED_EN: Pick<Derived, 't' | 'v' | 'tag' | 'd'>[] = [
  {
    t: 'Three manufacturers + data · SW · AI upskilling',
    v: '6 yrs · 5 orgs',
    tag: 'Upskilled',
    d: 'Shop-floor experience at Eunsung (production control), Elentec (line PM), and SolarEdge (process engineering), strengthened with data engineering, software, and applied-AI bootcamps, before joining a startup as head of operations. A full-cycle lead who solves domain problems in code and models.',
  },
  {
    t: 'Project portfolio',
    v: '16',
    tag: '',
    d: '16 self-initiated projects across five organizations — vision inspection, smart factory, line innovation, logistics SCM, data and traceability, an in-house MES, and at the startup: infrastructure (ECS, Terraform), Notion OS, backend, CRM, kiosk app, and hardware. Two awards (MOC Best, Core Value).',
  },
]

const SKILLS_EN: SkillGroup[] = [
  ['Shop floor · process', [['Production · process control', 1], ['LOB · C/T analysis', 1], ['DOE · PFMEA', 1], ['Jigs · vision inspection', 1], ['IATF16949 · ERP/MES', 1]]],
  ['Data · software', [['Python · SQL', 1], ['Data integrity · DB design', 1], ['Power BI · Apps', 1], ['React · TS · FastAPI', 1]]],
  ['Cloud · AI', [['AWS · Terraform', 1], ['Observability · CI/CD', 1], ['AI MCP · agents', 1]]],
]

function rowFor(row: Row): Row {
  const en = ROW_EN[row.id]
  if (!en) return row
  return {
    ...row,
    co: en.co,
    role: en.role,
    problem: en.problem,
    built: en.built,
    desc: en.desc,
    stack: en.stack,
    metrics: row.metrics.map((m, i) => (en.metrics[i] ? { ...m, k: en.metrics[i][0], v: en.metrics[i][1], c: en.metrics[i][2] } : m)),
  }
}

export interface GanttData {
  COMPANIES: Row[]
  PROJECTS: Row[]
  ROWS: Row[]
  MILES: Milestone[]
  KPIS: Kpi[]
  DERIVED: Derived[]
  SKILLS: SkillGroup[]
}

function buildRows(companies: Row[], projects: Row[]): Row[] {
  const out: Row[] = []
  for (const c of companies) {
    out.push(c)
    for (const p of projects) if (p.parent === c.id) out.push(p)
  }
  return out
}

const KO_DATA: GanttData = { COMPANIES, PROJECTS, ROWS: buildRows(COMPANIES, PROJECTS), MILES, KPIS, DERIVED, SKILLS }

const EN_DATA: GanttData = (() => {
  const companies = COMPANIES.map(rowFor)
  const projects = PROJECTS.map(rowFor)
  return {
    COMPANIES: companies,
    PROJECTS: projects,
    ROWS: buildRows(companies, projects),
    MILES: MILES.map((m, i) => ({ ...m, label: MILES_EN[i] ?? m.label })),
    KPIS: KPIS.map((k, i) => ({ ...k, ...KPIS_EN[i] })),
    DERIVED: DERIVED.map((d, i) => ({ ...d, ...DERIVED_EN[i] })),
    SKILLS: SKILLS_EN,
  }
})()

export function ganttData(locale: Locale): GanttData {
  return locale === 'en' ? EN_DATA : KO_DATA
}

/** Imperative labels written by the board runtime (tooltip, detail panel, bars). */
export const GANTT_UI = {
  ko: {
    critical: '크리티컬 패스',
    study: '역량 보강 (부트캠프)',
    float: (n: number) => `병렬 (Float ${n}mo)`,
    selfLed: '자기주도 프로젝트',
    clickForDetail: '클릭하여 상세',
    present: '현재',
    progress: (pct: number) => `진척 ${pct}%`,
    critDetail: '● CRITICAL PATH · 이 경력은 커리어 핵심 의존 체인 위에 있습니다 (Slack 0)',
    studyDetail: '◇ 역량 보강 · 부트캠프 학습 과정',
    awardDetail: (award: string) => `★ ${award} · 자기주도 프로젝트`,
    floatDetail: (n: number) => `○ 병렬 프로젝트 · 여유(Float) ${n}개월`,
    selfDetail: '○ 자기주도 프로젝트 · 회사 성과의 본선 기여',
    ongoingBar: (pct: number) => `${pct}% · 진행중`,
    ongoingShort: (pct: number) => `${pct}%·진행`,
  },
  en: {
    critical: 'Critical path',
    study: 'Upskilling (bootcamp)',
    float: (n: number) => `Parallel (float ${n} mo)`,
    selfLed: 'Self-initiated project',
    clickForDetail: 'click for details',
    present: 'Present',
    progress: (pct: number) => `${pct}% complete`,
    critDetail: '● CRITICAL PATH · this role sits on the core dependency chain of the career (slack 0)',
    studyDetail: '◇ Upskilling · bootcamp course',
    awardDetail: (award: string) => `★ ${award} · self-initiated project`,
    floatDetail: (n: number) => `○ Parallel project · float ${n} months`,
    selfDetail: '○ Self-initiated project · contributes to the main company outcome',
    ongoingBar: (pct: number) => `${pct}% · ongoing`,
    ongoingShort: (pct: number) => `${pct}% · ongoing`,
  },
} as const
