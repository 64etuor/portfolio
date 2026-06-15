import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Scene } from './Scene'

/**
 * 풀스크린 인터랙티브 3D 플레이그라운드.
 * 무중력 물리 공간에 떠 있는 오브젝트들을 마우스로 끌고/부딪칠 수 있다.
 */
export function Experience() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 16], fov: 38 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#f1ede3']} />
      <fog attach="fog" args={['#f1ede3', 22, 34]} />
      <ambientLight intensity={0.8} />
      <directionalLight
        castShadow
        position={[6, 9, 6]}
        intensity={2}
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-12, 12, 12, -12, 0.1, 40]} />
      </directionalLight>
      <directionalLight position={[-8, -4, -6]} intensity={0.4} color="#9aa7ff" />
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]}>
          <Scene />
        </Physics>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  )
}
