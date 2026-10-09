import type { Locale } from '@/i18n/content'
import type { SceneEntry, SceneKey } from '@/scenes/catalog'

type EnglishSceneMeta = { title: string; domain?: string }

/** English projection of the scene catalog. Korean remains the catalog SSOT. */
export const EN_SCENE_META: Partial<Record<SceneKey, EnglishSceneMeta>> = {
  '05-bios-boot': { title: 'BIOS / POST Boot', domain: 'Firmware' },
  'x-smart-factory': { title: 'Smart Factory Digital Twin', domain: 'Candidate' },
  'x-mes-line': { title: 'MES Line Build', domain: 'Candidate' },
  'x-excel-to-db': { title: 'Excel → Database', domain: 'Candidate' },
  'x-vision-reverse': { title: 'Vision Inspection · Reversed Cell', domain: 'Candidate' },
  'x-sn-trace': { title: 'S/N Traceability', domain: 'Candidate' },
  'x-weld-doe': { title: 'Ultrasonic Weld DOE', domain: 'Candidate' },
  'x-lob-balance': { title: 'Line Balancing (LOB)', domain: 'Candidate' },
  'x-kip-evidence': { title: 'KIP · Evidence Locator', domain: 'Candidate' },
  'x-work-radar-rails': { title: 'Work Radar · Two Rails', domain: 'Candidate' },
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
  'radar-sonar': { title: 'Work Radar — AI Workflow Cockpit', domain: 'Project' },
  'instrument-rack': { title: 'Production Operations · Cost First Principles', domain: 'Manufacturing · Cost' },
  'sonar-waterfall': { title: 'Ultrasonic Welding DOE', domain: 'Manufacturing · Welding' },
  'scada-hmi': { title: 'SCM · Inventory Optimisation', domain: 'Logistics · SCM' },
  'gantt-cpm': { title: 'Career Timeline — Experience + Projects', domain: 'Career Overview' },
  'mes-console': { title: 'MES Delivery', domain: 'Manufacturing · MES' },
  'cmm-metrology': { title: 'CMM Precision Measurement · GD&T Inspection', domain: 'Metrology · CMM' },
  'weld-thermal': { title: 'Industrial Welding Engineering', domain: 'Process Engineering' },
  'robot-pendant': { title: 'Equipment · Robot Teaching', domain: 'Equipment' },
  'pid-scheme': { title: 'System Topology', domain: 'Architecture' },
  'db-architecture': { title: 'Database Modelling', domain: 'Data · Database' },
  'ide-coding': { title: 'IDE Coding Screen' },
  'digital-twin': { title: 'Future Usefulness of Domain Knowledge', domain: 'Cross-domain' },
  'oscilloscope': { title: 'Relentless Quality Mindset', domain: 'Quality' },
  'ai-latent': { title: 'Vault Semantic Map', domain: 'Knowledge · AI' },
  'agent-governance': { title: 'Boule Governance', domain: 'AI Governance' },
  'decision-os': { title: 'Decision OS', domain: 'Decision-making' },
  'graphrag': { title: 'GraphRAG / Neuro-symbolic', domain: 'AI' },
  'gcode-printer': { title: 'G-code 3D Printer Build', domain: 'Additive Manufacturing' },
}

export function sceneForLocale(scene: SceneEntry, locale: Locale): SceneEntry {
  if (locale !== 'en') return scene
  const translation = EN_SCENE_META[scene.key]
  return translation ? { ...scene, title: translation.title, domain: translation.domain } : scene
}
