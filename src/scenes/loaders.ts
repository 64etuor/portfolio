// 포팅된 React 씬의 단일 lazy-loader 맵 (SSOT).
// 키 = 씬 디렉토리명 = public/lab 파일 basename(.html 제거). registry/Film/갤러리/단독
// 라우트가 모두 이 맵을 통해 동일 컴포넌트를 코드스플릿 로드한다.
import type { ComponentType } from 'react'
import type { SceneProps } from './_host/types'

export type SceneLoader = () => Promise<{ default: ComponentType<SceneProps> }>

const SCENE_LOADERS: Record<string, SceneLoader> = {
  '05-bios-boot': () => import('./05-bios-boot/Scene'),
  '28-gap-reality': () => import('./28-gap-reality/Scene'),
  '29-lost-in-translation': () => import('./29-lost-in-translation/Scene'),
  '30-collision': () => import('./30-collision/Scene'),
  '31-cost-cascade': () => import('./31-cost-cascade/Scene'),
  '32-the-connector': () => import('./32-the-connector/Scene'),
  '33-ax-era': () => import('./33-ax-era/Scene'),
  '36-bridge-experts': () => import('./36-bridge-experts/Scene'),
  '37-cross-domain': () => import('./37-cross-domain/Scene'),
  '38-ending-catchphrase': () => import('./38-ending-catchphrase/Scene'),
  '41-perspectives': () => import('./41-perspectives/Scene'),
  '42-era-shift': () => import('./42-era-shift/Scene'),
  'agent-governance': () => import('./agent-governance/Scene'),
  'ai-latent': () => import('./ai-latent/Scene'),
  'cmm-metrology': () => import('./cmm-metrology/Scene'),
  'db-architecture': () => import('./db-architecture/Scene'),
  'decision-os': () => import('./decision-os/Scene'),
  'digital-twin': () => import('./digital-twin/Scene'),
  'gantt-cpm': () => import('./gantt-cpm/Scene'),
  'gcode-printer': () => import('./gcode-printer/Scene'),
  graphrag: () => import('./graphrag/Scene'),
  'ide-coding': () => import('./ide-coding/Scene'),
  'instrument-rack': () => import('./instrument-rack/Scene'),
  'mes-console': () => import('./mes-console/Scene'),
  oscilloscope: () => import('./oscilloscope/Scene'),
  'pid-scheme': () => import('./pid-scheme/Scene'),
  'pipeline-dag': () => import('./pipeline-dag/Scene'),
  'radar-sonar': () => import('./radar-sonar/Scene'),
  'robot-pendant': () => import('./robot-pendant/Scene'),
  'scada-hmi': () => import('./scada-hmi/Scene'),
  'sonar-waterfall': () => import('./sonar-waterfall/Scene'),
  'weld-thermal': () => import('./weld-thermal/Scene'),
}

/** "pipeline-dag.html" | "pipeline-dag" → loader (없으면 undefined). */
export function loaderFor(fileOrName: string): SceneLoader | undefined {
  return SCENE_LOADERS[fileOrName.replace(/\.html$/, '')]
}
