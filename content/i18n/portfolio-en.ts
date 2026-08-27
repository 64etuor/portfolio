import type { Metric, ProjectContent, Section } from '@content/projects/types'
import type { Locale } from '@/i18n/content'

type EnglishProject = {
  hero: Pick<ProjectContent['hero'], 'title' | 'company' | 'role'>
  summary: string
  metrics: Metric[]
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
    summary: 'When an automated production line moved to Korea, I found that MES outsourcing had been omitted from an already-overrun equipment budget. I planned and delivered a React, Django, and PostgreSQL MES prototype in three months.',
    metrics: [metric('Wireless scan latency', '≤150 ms', 'Barcode registration target in Wi-Fi conditions'), metric('Equipment integrations', '3', 'OPC UA, OCV/IR inspection, and TCP/IP vision'), metric('Delivery model', 'In-house', 'Replaced an unbudgeted outsourcing cost')],
    sections: [section('Challenge', 'The transferred line had exceeded its automation budget before its MES budget gap was discovered. The goal was to keep production data, traceability, and operator workflows moving without another vendor dependency.'), section('Delivery', '- Designed the production-history and serial-number validation model in PostgreSQL.\n- Built Django APIs, a React and Electron registration flow, and equipment ETL adapters.\n- Connected barcode scanning, OCV/IR inspection, OPC UA equipment data, and vision data.'), section('Outcome', 'Achieved barcode registration responses within **150 ms** over Wi-Fi and completed a production-ready prototype in three months. The program stopped before mass production when the business closed.')],
  },
  'dv-data': {
    hero: { title: 'DV Data Management Platform', company: 'SolarEdge', role: 'Product planning, application development, and data analytics' },
    summary: 'A data-management platform for time-boxed Design Validation work across multiple sites, built to increase usable evidence and make test status visible in real time.',
    metrics: [metric('Scope', 'Multi-site DV', 'One view of concurrent validation work'), metric('Traceability', 'QR prototype', 'Designed for battery-passport readiness')],
    sections: [section('Challenge', 'DV teams needed to collect high-quality data quickly while tracking several sites at once. Existing spreadsheets made status and serial-level evidence difficult to reconcile.'), section('Delivery', '- Built a production and defect-entry prototype with Google AppSheet.\n- Added Python process analysis and a live Google Sheets dashboard.\n- Prototyped QR-based serial-number history lookup for traceability.'), section('Outcome', 'Created a unified DV operating view and validated the traceability pattern later used as a foundation for MES database design.')],
  },
  traceability: {
    hero: { title: 'Process Traceability Management System', company: 'SolarEdge', role: 'System design, data analysis, and application development' },
    summary: 'A serial-number-based traceability system that connects production and inspection records into a searchable operating history.',
    metrics: [metric('Traceability key', 'Serial number', 'Linked process and inspection history'), metric('Reporting', 'Automated', 'Inspection evidence issued from one system')],
    sections: [section('Challenge', 'Production and quality data lived in separate files and systems, making it slow to trace a product from a defect back through its process history.'), section('Delivery', '- Modeled serial-number lineage across production and inspection steps.\n- Built data-collection and lookup workflows for operators.\n- Automated inspection-report issuance from the captured evidence.'), section('Outcome', 'Made serial-level production history searchable and reduced manual reconstruction work during quality investigations.')],
  },
  'process-data': {
    hero: { title: 'Process Data Management System', company: 'SolarEdge', role: 'Requirements discovery, database architecture, and solution delivery' },
    summary: 'A structured data-management system for production, defect, KPI, BOM, standard-time, and work-order information.',
    metrics: [metric('Data model', 'Relational', 'Production operations normalized into a shared structure'), metric('Visibility', 'Real-time', 'Dashboards for operating decisions')],
    sections: [section('Challenge', 'Operational data was fragmented across spreadsheets, equipment exports, and team-owned files, which prevented a reliable view of production performance.'), section('Delivery', '- Defined a normalized database architecture for core manufacturing entities.\n- Connected collection, cleansing, and dashboard workflows.\n- Designed the system around practical decisions: output, defects, standard time, and operating cost.'), section('Outcome', 'Established a single operating data structure that supports both daily dashboards and longer-term process improvement.')],
  },
  'samsung-logistics': {
    hero: { title: 'Warehouse Logistics Improvement', company: 'E-Land Tech / Samsung Academy', role: 'Cross-functional improvement project lead' },
    summary: 'A three-month warehouse and inventory-flow improvement program delivered with Samsung manufacturing-leader mentoring.',
    metrics: [metric('Inventory turnover', '+17%', 'Project KPI'), metric('Program length', '3 months', 'Cross-functional improvement team')],
    sections: [section('Challenge', 'Inventory congestion and hand-off errors between manufacturing and sales warehouses created cost and visibility problems.'), section('Delivery', '- Led a cross-functional team across purchasing, sales, manufacturing, and production control.\n- Redesigned inventory-transfer workflows and clarified liability zones.\n- Applied workplace organization and visual-management practices in both warehouses.'), section('Outcome', 'Improved inventory turnover by **17%** and increased the transparency of warehouse operations.')],
  },
  'idle-equipment': {
    hero: { title: 'Idle Equipment Reuse Program', company: 'E-Land Tech', role: 'Project planning and equipment-utilization review' },
    summary: 'A reuse program that converted an idle vision-inspection asset into a quality-control capability instead of retiring it.',
    metrics: [metric('Approach', 'Reuse', 'Avoided replacement and disposal cost'), metric('Capability', 'Vision inspection', 'Introduced to a previously uncovered process')],
    sections: [section('Challenge', 'A vision-inspection machine sat unused while another process lacked an automated quality-control step.'), section('Delivery', '- Assessed equipment capability and process fit.\n- Coordinated suppliers and implementation work.\n- Defined the operating workflow for the new inspection point.'), section('Outcome', 'Extended the useful life of an existing asset and introduced an additional quality-control layer without a new equipment purchase.')],
  },
  'line-innovation': {
    hero: { title: 'Annual Production-line Innovation Program', company: 'E-Land Tech', role: 'Manufacturing improvement project lead' },
    summary: 'A multi-track manufacturing improvement program spanning welding quality, cycle time, line balancing, MES adoption, and cost reduction.',
    metrics: [metric('Defect rate', '15% → <1%', 'Ultrasonic welding optimization'), metric('Productivity', '+24%', 'Small-pack line rebalance'), metric('Program', '10 months', 'Quality, speed, and cost improvements')],
    sections: [section('Challenge', 'Ultrasonic welding defects and rework were driving waste while several production processes had avoidable cycle-time and balancing losses.'), section('Delivery', '- Ran DOE to optimize ultrasonic welding conditions.\n- Designed cutting and inspection jigs to shorten cycle times.\n- Rebalanced the line, introduced MES-based monitoring, and standardized project-management practices.'), section('Outcome', 'Reduced welding defects to below one percent, improved small-pack line productivity by **24%**, and delivered recurring savings across quality, speed, and cost.')],
  },
  'smart-factory': {
    hero: { title: 'Smart Factory Introduction Program', company: 'Eunsung SIT', role: 'Project application, delivery management, and requirements definition' },
    summary: 'A government-supported digitalization program that introduced ERP, barcode management, and tablet-based production visibility.',
    metrics: [metric('Delivery time', '≈6 months', 'ERP, barcode, and tablet workflows'), metric('Operating model', 'Digital', 'Production, inventory, and purchasing data unified')],
    sections: [section('Challenge', 'Manual operating records limited visibility into production, inventory, and purchasing activity.'), section('Delivery', '- Defined requirements and managed the implementation program.\n- Introduced ERP for core operating data.\n- Added barcode control and tablet-based production-status capture.'), section('Outcome', 'Established a practical digital operating baseline while minimizing cost through the government support program.')],
  },
  'work-radar': {
    hero: { title: 'Work Radar — Local-first AI Workflow Cockpit', company: 'Independent Project', role: 'Product strategy, frontend, Rust backend, and local-automation architecture' },
    summary: 'A desktop operating cockpit for personal work that unifies signals, scheduling, agent execution, governance, and review without giving automation control over decisions.',
    metrics: [metric('Runtime', 'Tauri 2 + Rust', 'Local-first desktop application'), metric('Safety model', 'Human gate', 'External write actions stay proposal-first'), metric('Surfaces', '5', 'Capture, schedule, jobs, governance, and review')],
    sections: [section('Challenge', 'A developer’s calendar, pull requests, backlog, local worktrees, and agent sessions move at different speeds. The bottleneck is often deciding what deserves attention now.'), section('Delivery', '- Built capture, timeline, governance, and review surfaces as one desktop cockpit.\n- Added bounded agent execution with time, turn, cost, and approval controls.\n- Designed external writes through proposal-first human gates.'), section('Outcome', 'Created a repeatable local operating system that makes AI-assisted work observable and controllable rather than opaque.')],
  },
  'notion-os': {
    hero: { title: 'Notion Operating System', company: 'Independent Project', role: 'Information architecture and operating-system design' },
    summary: 'An operating layer that routes discussion into decisions, actions, OKRs, backlog items, PRDs, and runbooks around a clear source-of-truth model.',
    metrics: [metric('Model', 'SSOT', 'Every information type has a canonical home'), metric('Flow', 'Decision → action', 'Meeting output becomes operational state')],
    sections: [section('Challenge', 'Teams lose context when decisions, tasks, requirements, and documentation are copied across disconnected tools.'), section('Delivery', '- Defined canonical locations for code facts, documentation, work items, goals, and decisions.\n- Modeled review cycles and ownership in Notion.\n- Designed an AI-assisted meeting-notes routing workflow.'), section('Outcome', 'Turned a wiki into an operating layer where people can see whether a document is authoritative and what should happen next.')],
  },
  'kiosk-app': {
    hero: { title: 'Beauty Retail CRM, Kiosk, and App Platform', company: 'Startup', role: 'Product definition, delivery management, backend, infrastructure, and hardware prototyping' },
    summary: 'A connected product platform for beauty stores that brings CRM, kiosks, collaboration software, and mobile experiences into one data-driven operating model.',
    metrics: [metric('Product surfaces', '4', 'CRM, kiosk, collaboration software, and app'), metric('Platform', 'Full stack', 'FastAPI, MySQL, AWS/GCP, and CI/CD')],
    sections: [section('Challenge', 'Store sales and customer-use data were disconnected, limiting both customer experience and data-driven operations.'), section('Delivery', '- Defined product requirements and delivery plans across CRM, kiosk, collaboration, and app experiences.\n- Built FastAPI services, MySQL data models, cloud infrastructure, and CI/CD.\n- Managed kiosk hardware prototyping and designed AI-enabled operating workflows.'), section('Outcome', 'Created the foundation for a unified retail product platform and operational analytics.')],
  },
  kip: {
    hero: { title: 'KIP — Evidence-first Knowledge Fabric Starter Kit', company: 'Independent Project', role: 'Product design, retrieval pipeline, parser isolation, and operating documentation' },
    summary: 'An evidence-first retrieval system for organizations whose knowledge is scattered across shared folders, HWP/HWPX files, scanned PDFs, slides, spreadsheets, and chat.',
    metrics: [metric('Parsing speed', '19.2×', 'Across six public PDFs'), metric('Database sync', '3.23×', 'PostgreSQL synchronization'), metric('Recall@10', '1.0000', 'Lexical search after performance improvements')],
    sections: [section('Challenge', 'A RAG answer is not useful in practice when its source cannot be verified. Korean manufacturing documents add hard cases: HWP files and tables often carry the critical meaning.'), section('Delivery', '- Designed one retrieval service behind CLI, REST/OpenAPI, and optional MCP surfaces.\n- Required locators in every response and tested whether they point to real pages or blocks.\n- Isolated parsers in bounded processes and kept safe rollback paths for document backends.'), section('Outcome', 'Delivered a verifiable, evidence-first foundation with measurable parsing gains and no observed ACL leakage in evaluation.')],
  },
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
    sections: english.sections,
    // Captions, diagrams, and scene interfaces are authored as Korean visual
    // artifacts. Do not mix that source language into the English document.
    gallery: undefined,
    diagram: undefined,
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
    { name: 'SolarEdge Technologies Korea', position: 'Process Engineering', period: 'Sep 2023 – Dec 2024', summary: 'Built manufacturing-data, quality, KPI, standard-time, and OPEX operating systems while establishing MES workflows for a new product line.', highlights: ['Collected, cleansed, and operated production and quality data in databases and dashboards.', 'Improved process capability, jigs, standard time, and inspection workflows.', 'Built traceability and automated inspection-report capabilities.'] },
    { name: 'E-Land Tech', position: 'Production-line PM / Team Lead', period: 'Nov 2022 – Sep 2023', summary: 'Led productivity, welding DOE, and logistics-improvement work across manufacturing operations.', highlights: ['Analyzed capacity, line balance, and cycle time for productivity improvement.', 'Optimized spot, laser, and ultrasonic welding processes.', 'Led warehouse SCM improvement with Samsung manufacturing mentoring.'] },
    { name: 'Eunsung SIT', position: 'Production Control Manager', period: 'Aug 2020 – Nov 2022', summary: 'Led battery-pack and component manufacturing operations, cost analysis, production planning, and inventory improvement.', highlights: ['Managed production operations for battery packs, purifier components, and wiring harnesses.', 'Analyzed manufacturing cost and operating-cost structures using capacity, labor, output, and inventory data.', 'Introduced ERP and production-material status systems and managed quality certifications.'] },
  ],
  skills: [
    { name: 'Operations & Manufacturing', keywords: ['Production Operations', 'Process Engineering', 'MES', 'SCM', 'Lean Improvement', 'Quality'] },
    { name: 'Data & Software', keywords: ['Python', 'SQL', 'PostgreSQL', 'FastAPI', 'React', 'TypeScript', 'Rust'] },
    { name: 'AI & Knowledge Systems', keywords: ['RAG', 'MCP', 'Automation', 'Information Architecture', 'Governance'] },
  ],
  education: [{ title: 'Beyond SW Bootcamp, Hanwha Systems', subtitle: 'Backend, frontend, and DevOps' }, { title: 'Data Analytics Bootcamp', subtitle: 'Python, SQL, BI visualization, machine learning, and e-commerce analytics' }],
} as const
