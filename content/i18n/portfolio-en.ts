import type { Metric, ProjectContent, Section } from '@content/projects/types'
import type { Locale } from '@/i18n/content'

type EnglishProject = {
  hero: Pick<ProjectContent['hero'], 'title' | 'company' | 'role'>
  summary: string
  metrics: Metric[]
  stack: string[]
  sections: Section[]
}

const section = (heading: string, body: string): Section => ({ heading, body })
const metric = (label: string, value: string, note?: string): Metric => ({ label, value, note })

/**
 * English portfolio copy, keyed by the immutable project slug. Korean project
 * records remain the operational source of truth; this table is the one
 * language projection consumed by every English project surface.
 */
export const EN_PROJECTS: Record<string, EnglishProject> = {
  'mes-console': {
    hero: { title: 'New Product Line Setup — In-house MES', company: 'SolarEdge', role: 'New product line setup and MES delivery' },
    summary: 'When the automated line for a new product, a glass-wool pouch for battery fire prevention, moved to Korea, I found that MES outsourcing had been omitted from an already-overrun equipment budget. I planned and delivered a React, Django, and PostgreSQL MES prototype in three months.',
    metrics: [metric('Wireless scan latency', '≤150 ms', 'Barcode registration target in Wi-Fi conditions'), metric('Equipment integrations', '3', 'OPC UA equipment, a legacy test rig (MS Access), and TCP/IP vision'), metric('Delivery model', 'In-house', 'Replaced an unbudgeted outsourcing cost')],
    stack: ['Python', 'Django', 'Django REST Framework', 'React', 'TypeScript', 'Electron', 'Material UI', 'Ant Design', 'PostgreSQL', 'OPC UA'],
    sections: [section('Challenge', 'The transferred line had exceeded its automation budget before its MES budget gap was discovered. The goal was to keep production data, traceability, and operator workflows moving without another vendor dependency.'), section('Delivery', '- Designed the production-history and serial-number validation model in PostgreSQL.\n- Built Django APIs, a React and Electron registration flow, and equipment ETL adapters.\n- Connected barcode scanning, OPC UA equipment data, a legacy test rig via Python and MS Access, and TCP/IP vision data.'), section('Outcome', 'Achieved barcode registration responses within **150 ms** over Wi-Fi and completed the prototype in three months without outsourcing. The project stopped before mass production when the business was wound down.')],
  },
  'dv-data': {
    hero: { title: 'DV Data Management Platform', company: 'SolarEdge', role: 'Product planning, application development, and data analytics' },
    summary: 'A data-management platform for time-boxed Design Verification (DV) work across multiple sites, built to increase usable evidence and make test status visible in real time.',
    metrics: [metric('Dashboard refresh', 'Every 5 min', 'One live view of DV status across sites'), metric('QR history', 'S/N-based', 'Apps Script prototype for EU battery-passport readiness'), metric('Analysis', 'CPK included', 'Process capability calculated and charted in Python Matplotlib')],
    stack: ['Google AppSheet', 'Google Sheets', 'Google Apps Script', 'Python', 'Matplotlib'],
    sections: [section('Challenge', 'DV teams needed to collect high-quality data quickly while tracking several sites at once. Existing spreadsheets made status and serial-level evidence difficult to reconcile.'), section('Delivery', '- Built a production and defect-entry prototype with Google AppSheet.\n- Added Python process analysis and a live Google Sheets dashboard.\n- Prototyped QR-based serial-number history lookup for traceability.'), section('Outcome', 'Created a unified DV operating view and validated the traceability pattern later used as a foundation for MES database design.')],
  },
  traceability: {
    hero: { title: 'Process Traceability Management System', company: 'SolarEdge', role: 'System design, data analysis, and application development' },
    summary: 'A raw-material defect surfaced in the field, and handwritten S/N records made the risk scope impossible to measure. I planned and built a Power Apps traceability app so it could not happen again.',
    metrics: [metric('Award', '2024 Core Value Award', 'System that keeps field raw-material defects from recurring'), metric('S/N control', 'Paper → system', 'Validation logic blocks mixed parts and skipped steps'), metric('Inspection reports', 'Issued on completion', 'Power Automate files the report to the server automatically')],
    stack: ['Power Apps', 'Power BI', 'Power Automate', 'SharePoint List'],
    sections: [section('Challenge', 'Production and quality data lived in separate files and systems, making it slow to trace a product from a defect back through its process history.'), section('Delivery', '- Modeled serial-number lineage across production and inspection steps.\n- Built data-collection and lookup workflows for operators.\n- Automated inspection-report issuance from the captured evidence.'), section('Outcome', 'Made serial-level production history searchable and reduced manual reconstruction work during quality investigations.')],
  },
  'process-data': {
    hero: { title: 'Process Data Management System', company: 'SolarEdge', role: 'Requirements discovery, database architecture, and solution delivery' },
    summary: 'Production, labor-hour, and defect data scattered across per-owner Excel files moved into one SharePoint database, with a Power Apps entry solution and a unified Power BI dashboard — office work cut by 451 minutes a day and product ST by 50%.',
    metrics: [metric('Office work', '−451 min/day', 'Manual Excel work → database automation; ≈ ₩50M a year'), metric('Product ST', '−50%', 'Normalized on real labor data, not a process change'), metric('Award', '2023 MOC Best Employee', 'Top employee across SolarEdge MOC')],
    stack: ['Power Apps', 'Power BI', 'Power Automate', 'SharePoint List', 'Excel VBA', 'On-premises Gateway'],
    sections: [section('Challenge', 'Operational data was fragmented across spreadsheets, equipment exports, and team-owned files, which prevented a reliable view of production performance.'), section('Delivery', '- Defined a normalized database architecture for core manufacturing entities.\n- Connected collection, cleansing, and dashboard workflows.\n- Designed the system around practical decisions: output, defects, standard time, and operating cost.'), section('Outcome', 'Established a single operating data structure that supports both daily dashboards and longer-term process improvement.')],
  },
  'samsung-logistics': {
    hero: { title: 'Warehouse Logistics Improvement', company: 'Elentec / Samsung Academy', role: 'Cross-functional improvement project lead' },
    summary: 'A three-month warehouse and inventory-flow improvement program delivered with Samsung manufacturing-leader mentoring.',
    metrics: [metric('Inventory turnover', '+17%', 'Project KPI'), metric('Program length', '3 months', 'Cross-functional improvement team')],
    stack: ['Cross-functional task force', 'Logistics process improvement', '3S and 5S', 'WBS / Gantt'],
    sections: [section('Challenge', 'Inventory congestion and hand-off errors between manufacturing and sales warehouses created cost and visibility problems.'), section('Delivery', '- Led a cross-functional team across purchasing, sales, manufacturing, and production control.\n- Redesigned inventory-transfer workflows and clarified liability zones.\n- Applied workplace organization and visual-management practices in both warehouses.'), section('Outcome', 'Improved inventory turnover by **17%** and increased the transparency of warehouse operations.')],
  },
  'idle-equipment': {
    hero: { title: 'Idle Equipment Reuse Program', company: 'Elentec', role: 'Project planning and equipment-utilization review' },
    summary: 'Four idle vision-inspection machines (about ₩40M each when new) were reused instead of scrapped, bringing vision inspection to processes that had none and saving about ₩4M in equipment cost.',
    metrics: [metric('Vision equipment cost saved', '≈ ₩4M', 'Against the vendor quote'), metric('Machines reused', '4', 'Three put to work, one kept as a spare')],
    stack: ['Vision inspection system', 'Davichi Vision', 'TOS', 'General-purpose vision inspection software'],
    sections: [section('Challenge', 'Four vision-inspection machines sat idle while several processes had no automated inspection step.'), section('Delivery', '- One unit: supplied to the builder of a semi-automatic medical-kit assembly machine, offsetting part of its vision-system cost.\n- One unit: general-purpose vision software checking for missing inserts and nuts on molded parts.\n- One unit: vision check against reversed cells in battery modules.\n- One unit: kept as a spare. Coordinated the suppliers (Davichi Vision, TOS) end to end.'), section('Outcome', 'Saved about ₩4M against the vendor quote and added vision inspection to molding and battery-module lines that had none.')],
  },
  'line-innovation': {
    hero: { title: 'Annual Production-line Innovation Program', company: 'Elentec', role: 'Manufacturing improvement project lead' },
    summary: 'A multi-track manufacturing improvement program spanning welding quality, cycle time, line balancing, MES adoption, and cost reduction.',
    metrics: [metric('Ultrasonic weld defects', '15% → <1%', 'DOE-based condition optimization'), metric('Neck C/T', '−24%', '16.72 s → 12.76 s'), metric('Core-pack FT C/T', '−49%', '55 s → 28 s'), metric('Small-pack line productivity', '+24%', '≈ ₩44.37M a year')],
    stack: ['DOE', 'Jig design', 'MES', 'WBS / Gantt', 'Python', '3S and 5S'],
    sections: [section('Challenge', 'Ultrasonic welding defects and rework were driving waste while several production processes had avoidable cycle-time and balancing losses.'), section('Delivery', '- Ran DOE to optimize ultrasonic welding conditions.\n- Designed cutting and inspection jigs to shorten cycle times.\n- Rebalanced the line, introduced MES-based monitoring, and standardized project-management practices.'), section('Outcome', 'Reduced welding defects to below one percent, improved small-pack line productivity by **24%**, and delivered recurring savings across quality, speed, and cost.')],
  },
  'smart-factory': {
    hero: { title: 'Smart Factory Introduction Program', company: 'Eunsung SIT', role: 'Project application, delivery management, and requirements definition' },
    summary: 'A government-supported digitalization program that introduced ERP, barcode management, and tablet-based production visibility.',
    metrics: [metric('Delivery time', '≈6 months', 'ERP, barcode, and tablet workflows'), metric('Operating model', 'Digital', 'Production, inventory, and purchasing data unified')],
    stack: ['Ecount ERP', 'Barcode system', 'Mobile tablets'],
    sections: [section('Challenge', 'Manual operating records limited visibility into production, inventory, and purchasing activity.'), section('Delivery', '- Defined requirements and managed the implementation program.\n- Introduced ERP for core operating data.\n- Added barcode control and tablet-based production-status capture.'), section('Outcome', 'Established a practical digital operating baseline while minimizing cost through the government support program.')],
  },
  'work-radar': {
    hero: { title: 'Work Radar — Local-first AI Workflow Desktop App', company: 'Independent Project', role: 'Product strategy, frontend, Rust backend, and local-automation architecture' },
    summary: 'A local-first desktop app that gathers scattered work signals into an Eisenhower matrix and lets a person decide what becomes backlog, agenda, schedule, or a job. Automation (Codex) never enters the decision rail — it only proposes and executes inside bounded rails.',
    metrics: [metric('Scale', '1,432 commits', 'Phases 0–20 merged · dogfooded daily'), metric('Automation boundary', 'Out of the decision rail', 'Codex only on the proposal and execution rails'), metric('Agent sandbox', 'read_only / workspace_write', 'No danger_full mode'), metric('Execution control', 'Bounded', 'Timeout · max turns · cost cap · kill')],
    stack: ['Tauri 2', 'Rust', 'SQLite', 'React', 'TypeScript', 'Local automation'],
    sections: [section('Challenge', 'A developer’s calendar, pull requests, backlog, local worktrees, and agent sessions move at different speeds. The bottleneck is often deciding what deserves attention now.'), section('Delivery', '- Built capture, timeline, governance, and review surfaces as one desktop app.\n- Added bounded agent execution with time, turn, cost, and approval controls.\n- Designed external writes through proposal-first human gates.'), section('Outcome', 'Created a repeatable local operating system that makes AI-assisted work observable and controllable rather than opaque.')],
  },
  'notion-os': {
    hero: { title: 'Notion OS — Organizational Operating System', company: 'Startup', role: 'Information architecture and operating-system design' },
    summary: 'An operating layer that routes discussion into decisions, actions, OKRs, backlog items, PRDs, and runbooks around a clear source-of-truth model.',
    metrics: [metric('Model', 'SSOT', 'Every information type has a canonical home'), metric('Flow', 'Decision → action', 'Meeting output becomes operational state')],
    stack: ['Notion', 'Notion databases and relations', 'GitHub', 'Google Drive', 'AI reconciliation (LLM)'],
    sections: [section('Challenge', 'Teams lose context when decisions, tasks, requirements, and documentation are copied across disconnected tools.'), section('Delivery', '- Defined canonical locations for code facts, documentation, work items, goals, and decisions.\n- Modeled review cycles and ownership in Notion.\n- Designed an AI-assisted meeting-notes routing workflow.'), section('Outcome', 'Turned a wiki into an operating layer where people can see whether a document is authoritative and what should happen next.')],
  },
  'kiosk-app': {
    hero: { title: 'Beauty-store Kiosk — Software Architecture', company: 'Startup', role: 'Beauty-store kiosk — software architecture' },
    summary: 'Software architecture for an Electron kiosk in beauty stores. UI (renderer), backend (main), and device-helper processes talk only across a safe IPC boundary, and multi-camera capture, recording, and external AI calls are handled idempotently with offline integrity.',
    metrics: [metric('Architecture', 'Multi-process', 'UI · backend · device helper'), metric('UI structure', 'Component hierarchy', 'Reusable structure'), metric('Reliability', 'Idempotent', 'Duplicate captures and requests prevented'), metric('Offline', 'Local storage', 'Session and media integrity preserved'), metric('Media', 'Capture · record · device control', 'Multi-camera pipeline')],
    stack: ['Electron', 'React / TypeScript', 'IPC (Context Bridge)', 'Media pipeline', 'WebGL / WebGPU', 'Local database'],
    sections: [section('Layering', 'The Electron app is split into UI (renderer), backend (main), and a device helper; each layer talks only across an allowlisted IPC boundary.\n\n- **Renderer (UI)** — a reusable component hierarchy; camera streams and preview effects run in a post-processing pipeline.\n- **Preload (Context Bridge)** — exposes only vetted IPC helpers to the renderer (channel allowlist + argument validation).\n- **Main (backend)** — media jobs, device control, external integrations, and local storage.'), section('Media and devices', 'Multi-camera preview, still capture, and long recordings run through one media pipeline, and camera identification and permission changes are handled in one place.\n\n- **Idempotency** — every capture or request command carries a unique key so it never runs twice.\n- **Offline integrity** — sessions, media, and processing records are stored in a local database and survive network loss.\n- **Device abstraction** — OS-level camera differences sit behind one interface.'), section('External integrations', 'External AI calls are split into preprocessing, upload, request, and result collection, and the integration layer is isolated so swapping a provider does not ripple through the rest of the code. Results are stored locally before they reach the screen.')],
  },
  kip: {
    hero: { title: 'KIP — Evidence-first Knowledge Fabric Starter Kit', company: 'Independent Project', role: 'Product design, retrieval pipeline, parser isolation, and operating documentation' },
    summary: 'An evidence-first retrieval system for organizations whose knowledge is scattered across shared folders, HWP/HWPX files, scanned PDFs, slides, spreadsheets, and chat.',
    metrics: [metric('Parsing speed', '19.2×', 'Across six public PDFs'), metric('Database sync', '3.23×', 'PostgreSQL synchronization'), metric('Recall@10', '1.0000', 'Lexical search after performance improvements')],
    stack: ['Python 3.12', 'PostgreSQL 18', 'FastAPI', 'Typer', 'Pydantic v2', 'MCP', 'Docker', 'pdf-inspector', 'Kordoc'],
    sections: [section('Challenge', 'A RAG answer is not useful in practice when its source cannot be verified. Korean manufacturing documents add hard cases: HWP files and tables often carry the critical meaning.'), section('Delivery', '- Designed one retrieval service behind CLI, REST/OpenAPI, and optional MCP surfaces.\n- Required locators in every response and tested whether they point to real pages or blocks.\n- Isolated parsers in bounded processes and kept safe rollback paths for document backends.'), section('Outcome', 'Delivered a verifiable, evidence-first foundation with measurable parsing gains and no observed ACL leakage in evaluation.')],
  },
}

/**
 * English captions for project screenshots, keyed by image path. Screenshots
 * show the original (Korean) interfaces; the caption explains them in English.
 */
const EN_GALLERY_CAPTIONS: Record<string, string> = {
  "/projects/dv-data/batch_2024-12-09-08-29-05-1.png": "AppSheet work screen — module production entry",
  "/projects/dv-data/batch_2024-12-09-08-40-47.png": "AppSheet work screen — BPU registration",
  "/projects/dv-data/batch_2024-12-08-23-42-23-1.png": "Google Sheets data and query view",
  "/projects/dv-data/batch_2024-12-08-23-39-34.png": "Google Sheets live dashboard",
  "/projects/dv-data/batch_2024-12-09-08-37-33.png": "QR-code production history lookup",
  "/projects/mes-console/Pasted-image-20241202155547.png": "Production entry — barcode-scan input for manual lines",
  "/projects/mes-console/Pasted-image-20241202155608.png": "Production entry — detail form",
  "/projects/mes-console/Pasted-image-20241202155628.png": "Product lookup — full S/N history via the Django ORM",
  "/projects/mes-console/Pasted-image-20241202160214.png": "S/N validation entry form",
  "/projects/mes-console/Pasted-image-20241202160230.png": "S/N inspection results",
  "/projects/mes-console/Pasted-image-20241202160723.png": "Django REST Framework backend structure",
  "/projects/process-data/Pasted-image-20241202161931.png": "Solution — landing page",
  "/projects/process-data/Pasted-image-20241205182519.png": "Solution — mini dashboard (in-app production summary)",
  "/projects/process-data/Pasted-image-20241205180919.png": "Solution — work history entry",
  "/projects/process-data/Pasted-image-20241205180948.png": "Solution — work-order lookup",
  "/projects/process-data/Pasted-image-20241205180904.png": "Solution — defect entry",
  "/projects/process-data/Pasted-image-20241205181022.png": "Solution — process history lookup",
  "/projects/process-data/Pasted-image-20241205181008.png": "Solution — submission check (a commit refreshes the Power BI dataset and sends a Teams alert via RPA)",
  "/projects/process-data/Pasted-image-20241205181302.png": "Power BI — overall production status and metrics",
  "/projects/process-data/Pasted-image-20241205181430.png": "Power BI — per-line production status and detail metrics (ST, UPPH)",
  "/projects/process-data/Pasted-image-20241205181555.png": "Power BI — per-line output and defects by process",
  "/projects/process-data/Pasted-image-20241205181909.png": "Power BI — output by detailed process step",
  "/projects/process-data/Pasted-image-20241205181957.png": "Power BI — OEE and downtime, with labor loss converted to cost",
  "/projects/process-data/Pasted-image-20241205181756.png": "Power BI — defect status, with labor loss converted to cost",
  "/projects/process-data/Pasted-image-20241205181820.png": "Power BI — defect details",
  "/projects/process-data/Pasted-image-20241205182140.png": "Power BI — output detail and progress by work order",
  "/projects/process-data/Pasted-image-20241205181627.png": "Power BI — KPIs",
  "/projects/process-data/Pasted-image-20241205181718.png": "Power BI — labor-hour analysis",
  "/projects/process-data/Pasted-image-20241205182230.png": "Power BI — HR pages",
  "/projects/process-data/Pasted-image-20241205182304.png": "Power BI — attendance",
  "/projects/process-data/Pasted-image-20241205182339.png": "Power BI — OPEX cost analysis",
  "/projects/traceability/Pasted-image-20241202163306.png": "App home — output entry by process",
  "/projects/traceability/Pasted-image-20241202163355.png": "Operator self-inspection and checklist",
  "/projects/traceability/Pasted-image-20241202163454.png": "Process history lookup",
  "/projects/traceability/Pasted-image-20241202163518.png": "Instant Teams chat alert when an issue occurs",
  "/projects/work-radar/work-radar-01-capture-board-2026-06-15.png": "Capture Board — the first screen: an unsorted inbox on the left, an Eisenhower matrix in the centre, and a Today and routines rail on the right. The Agent Bar keeps Codex, Hermes, and cmux sessions in view.",
  "/projects/work-radar/work-radar-03-today-timeline-2026-06-15.png": "Today Timeline — drag items from the unscheduled tray onto the timeline to claim real time in the day. Signals, calendar, and routines share one time axis, and a Work Debt chip surfaces operating debt.",
  "/projects/work-radar/Pasted-image-20260615141933.png": "Weekly Review — throughput, PR activity, scheduled time, Life Wheel, and routine completion over a weekly window. Capture and Today data feed back into self-review metrics.",
  "/projects/work-radar/Pasted-image-20260615141953.png": "PR Radar — open PRs split into CI Blocked, Needs Review, Ready, Stale, and Merged Cleanup buckets with a readiness mix. Review, CI triage, and escalation go to the Jobs proposal rail instead of changing GitHub directly.",
  "/projects/work-radar/Pasted-image-20260615142021.png": "Worktree Diff — a branch-hygiene view condensing dirty, staged, and branch diffs across repos and worktrees. AI review is read-only: it flags risky changes, dead code, and missing tests rather than editing.",
  "/projects/work-radar/work-radar-08-jobs-agent-2026-06-15.png": "Jobs (Agent) — an execution audit surface where every Codex job carries a timeout, max turns, cost cap, and kill switch. Proposal jobs are edited and accepted by a person in the ProposalPanel, leaving a run, failure, and acceptance history.",
  "/projects/work-radar/work-radar-09-skills-registry-2026-06-15.png": "Skills Registry — search, tag, install, back up, and audit in-app prompts and external Claude, Codex, and Hermes skills. AI operating assets need inventory, divergence checks, backups, and audits just like code.",
  "/projects/work-radar/work-radar-10-control-room-2026-06-15.png": "Control Room — Boule Governance posture, ticker, readiness, and flow graph. The ghost SPEC · PLAN · TASK · SESSION · HANDOFF pipeline turns into a FlowSchematic once work appears, so a person can read and steer the tangled state.",
}

const EN_LINK_LABELS: Record<string, string> = {
  '/s/weld-doe': 'Ultrasonic Welding DOE',
  '/s/line-balance': 'LOB Line Balancing',
}

export function projectForLocale(project: ProjectContent, locale: Locale): ProjectContent {
  if (locale === 'ko') return project
  const english = EN_PROJECTS[project.slug]
  if (!english) throw new Error(`Missing English project content for "${project.slug}"`)

  return {
    ...project,
    hero: { ...project.hero, ...english.hero },
    summary: english.summary,
    metrics: english.metrics,
    stack: english.stack,
    sections: english.sections,
    links: project.links?.map((link) => ({ ...link, label: EN_LINK_LABELS[link.href] ?? link.label })),
    // Screenshots stay (they document the real interfaces); captions and alt
    // text come from the English caption table. The workflow diagram is
    // authored in English already.
    gallery: project.gallery?.map((item) => ({ src: item.src, caption: EN_GALLERY_CAPTIONS[item.src] })),
  }
}

export const EN_RESUME = {
  name: 'Yangha Park',
  label: 'Operations PM · Process Engineering · Data and AI Systems Builder',
  summary: 'Humanities-grounded engineer building practical operating systems through manufacturing, data, automation, and AI.',
  coverLetter: {
    to: 'To whom it may concern,',
    paragraphs: [
      'I work where manufacturing operations, data, and software meet. My focus is not just to identify a field problem, but to design and deliver the system that resolves it.',
      'Across production operations, process engineering, and product delivery, I have built systems for traceability, MES, warehouse logistics, workflow automation, and knowledge operations.',
      'I bring a field-first perspective to technical work: start with the decision that people need to make, structure the evidence, and build a dependable path from data to action.',
    ],
    signOff: 'Sincerely,',
  },
  work: [
    { name: 'Startup', position: 'Head of Operations / Director', period: 'Aug 2025 – Present', summary: 'Leading development of a beauty-retail product suite and AI-enabled operating systems.', highlights: ['Defined CRM, kiosk, collaboration-software, and app requirements and delivery plans.', 'Built FastAPI services, MySQL models, AWS/GCP infrastructure, and CI/CD.', 'Led kiosk hardware prototyping and AI/MCP-enabled workflow design.'] },
    { name: 'SolarEdge Technologies Korea', position: 'Process Engineer', period: 'Sep 2023 – Dec 2024', summary: 'Built manufacturing-data, quality, KPI, standard-time, and OPEX operating systems while establishing MES workflows for a new product line.', highlights: ['Collected, cleansed, and operated production and quality data in databases and dashboards.', 'Improved process capability, jigs, standard time, and inspection workflows.', 'Built traceability and automated inspection-report capabilities.'] },
    { name: 'Elentec', position: 'Production-line PM / Team Lead', period: 'Nov 2022 – Sep 2023', summary: 'Led productivity, welding DOE, and logistics-improvement work across manufacturing operations.', highlights: ['Analyzed capacity, line balance, and cycle time for productivity improvement.', 'Optimized spot, laser, and ultrasonic welding processes.', 'Led warehouse SCM improvement with Samsung manufacturing mentoring.'] },
    { name: 'Eunsung SIT', position: 'Production Control Manager', period: 'Aug 2020 – Nov 2022', summary: 'Led battery-pack and component manufacturing operations, cost analysis, production planning, and inventory improvement.', highlights: ['Managed production operations for battery packs, purifier components, and wiring harnesses.', 'Analyzed manufacturing cost and operating-cost structures using capacity, labor, output, and inventory data.', 'Introduced ERP and production-material status systems and managed quality certifications.'] },
  ],
  skills: [
    { name: 'Operations & Manufacturing', keywords: ['Production Operations', 'Process Engineering', 'MES', 'SCM', 'Lean Improvement', 'Quality'] },
    { name: 'Data & Software', keywords: ['Python', 'SQL', 'PostgreSQL', 'FastAPI', 'React', 'TypeScript', 'Rust'] },
    { name: 'AI & Knowledge Systems', keywords: ['RAG', 'MCP', 'Automation', 'Information Architecture', 'Governance'] },
  ],
  education: [
    { title: 'Kirana College (Australia)', subtitle: 'Social Media Marketing · Apr 2018 – Apr 2019 · Graduated' },
    { title: 'CTIC International College (Australia)', subtitle: 'Business Administration · Feb 2017 – Feb 2018 · Graduated' },
    { title: 'Hankuk University of Foreign Studies, Seoul', subtitle: 'Italian · Mar 2005 – Mar 2006 · Withdrew' },
    { title: 'Beyond SW Bootcamp, Hanwha Systems (Playdata)', subtitle: 'Backend, frontend, and DevOps · Jan 2025 – Jul 2025' },
    { title: 'Data Analytics Bootcamp (Metacode)', subtitle: 'Python, SQL, BI, and machine learning · Nov 2024 – Apr 2025' },
  ],
} as const
