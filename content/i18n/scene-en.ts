import type { Locale } from '@/i18n/content'
import type { SceneEntry, SceneKey } from '@/scenes/catalog'

type EnglishSceneMeta = { title: string; domain?: string }

/** English projection of the scene catalog. Korean remains the catalog SSOT. */
export const EN_SCENE_META: Partial<Record<SceneKey, EnglishSceneMeta>> = {
  '05-bios-boot': { title: 'BIOS / POST Boot', domain: 'Firmware' },
  '42-era-shift': { title: 'SCENE 01 · Era — THE ACCELERATION' },
  '33-ax-era': { title: 'SCENE 02 · Declaration — AX ERA' },
  '28-gap-reality': { title: 'SCENE 03 · Reality — THE DIVERGENCE' },
  '29-lost-in-translation': { title: 'SCENE 04 · Communication — LOST IN TRANSLATION' },
  '41-perspectives': { title: 'SCENE 05 · Perspectives — PERSPECTIVES' },
  '30-collision': { title: 'SCENE 06 · Collision — LEXICAL COLLISION' },
  '31-cost-cascade': { title: 'SCENE 07 · Cost — COST CASCADE' },
  '32-the-connector': { title: 'SCENE 08 · Connection — THE CONNECTOR' },
  '36-bridge-experts': { title: 'SCENE 09 · Solution — THE BRIDGE' },
  '37-cross-domain': { title: 'SCENE 10 · Core — CROSS-DOMAIN' },
  '38-ending-catchphrase': { title: 'Ending · The People Who Make the Future' },
  'pipeline-dag': { title: 'Notion OS — Organizational Operating System', domain: 'Project' },
  'x-work-radar-rails': { title: 'Work Radar · Decision Rail and Automation Rail', domain: 'Project' },
  'instrument-rack': { title: 'Production Operations · Cost First Principles', domain: 'Manufacturing · Cost' },
  'x-weld-doe': { title: 'Ultrasonic Welding DOE', domain: 'Manufacturing · Welding' },
  'x-lob-balance': { title: 'LOB Line Balancing', domain: 'Manufacturing · Line' },
  'scada-hmi': { title: 'SCM · Inventory Optimisation', domain: 'Logistics · SCM' },
  'gantt-cpm': { title: 'Career Timeline — Experience + Projects', domain: 'Career Overview' },
  'x-mes-line': { title: 'New Line MES, Built In-house', domain: 'Manufacturing · MES' },
  'x-sn-trace': { title: 'Process Traceability · S/N Tracking', domain: 'Quality · Traceability' },
  'x-excel-to-db': { title: 'Excel → Database', domain: 'Data · Database' },
  'x-vision-reverse': { title: 'Vision Inspection · Reversed-cell Detection', domain: 'Quality · Inspection' },
  'weld-thermal': { title: 'Industrial Welding Engineering', domain: 'Process Engineering' },
  'robot-pendant': { title: 'Equipment · Robot Teaching', domain: 'Equipment' },
  'pid-scheme': { title: 'System Topology', domain: 'Architecture' },
  'db-architecture': { title: 'Database Modelling', domain: 'Data · Database' },
  'ide-coding': { title: 'IDE Coding Screen' },
  'x-smart-factory': { title: 'Smart Factory Adoption', domain: 'Manufacturing · Smart Factory' },
  'agent-governance': { title: 'Boule Governance', domain: 'AI Governance' },
  'decision-os': { title: 'Decision OS', domain: 'Decision-making' },
  'x-kip-evidence': { title: 'KIP · Search with Source Locations', domain: 'Knowledge · Search' },
  'gcode-printer': { title: 'G-code 3D Printer Build', domain: 'Additive Manufacturing' },
}

export function sceneForLocale(scene: SceneEntry, locale: Locale): SceneEntry {
  if (locale !== 'en') return scene
  const translation = EN_SCENE_META[scene.key]
  return translation ? { ...scene, title: translation.title, domain: translation.domain } : scene
}
