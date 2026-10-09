'use client'

import { SceneHost } from '../_host/SceneHost'
import { useThreeScene } from '../_host/three/useThreeScene'
import type { SceneProps } from '../_host/types'

// 후보 씬 스텁 — 구현 에이전트가 교체한다.
export default function Scene({ running = true, onReady }: SceneProps) {
  const ref = useThreeScene(
    ({ THREE, scene, camera }) => {
      camera.position.set(0, 0, 6)
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.4, 1),
        new THREE.MeshBasicMaterial({ color: 0x4fe0c4, wireframe: true }),
      )
      scene.add(mesh)
      return {
        update(t) {
          mesh.rotation.set(t * 0.3, t * 0.45, 0)
        },
      }
    },
    { running, onReady, background: '#05070a' },
  )
  return (
    <SceneHost bg="#05070a" film={false} label="스마트 팩토리 디지털 트윈">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
    </SceneHost>
  )
}
