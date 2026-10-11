'use client'

import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'
import { COLORS } from './data'
import { Hud } from './Hud'
import { createSetup } from './runtime'

// 스마트 팩토리 디지털 트윈 — 수작업 라인(물리)을 스캔해 트윈으로 띄우고 ERP·바코드·태블릿으로 연결.
const setup = createSetup()

export default function Scene({ running = true, onReady, locale = 'ko' }: SceneProps) {
  const ref = useThreeScene(setup, {
    running,
    onReady,
    background: COLORS.bg,
    fov: 38,
    far: 120,
    exposure: 1.05,
    bloom: { strength: 0.85, radius: 0.6, threshold: 0.62 },
  })
  return (
    <SceneHost bg={COLORS.bg} film={false} label={locale === 'en' ? 'Smart factory adoption' : '스마트 팩토리 도입'}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <Hud locale={locale} />
    </SceneHost>
  )
}
