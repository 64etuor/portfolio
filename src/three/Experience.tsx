import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Float, MeshDistortMaterial } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'

/** 천천히 떠다니며 일렁이는 금속 토러스 노트 — 히어로 배경 오브젝트. */
function Artifact() {
  return (
    <Float speed={1.1} rotationIntensity={0.9} floatIntensity={1.4}>
      <mesh>
        <torusKnotGeometry args={[1, 0.32, 240, 32]} />
        <MeshDistortMaterial
          color="#c9a24b"
          roughness={0.2}
          metalness={0.85}
          distort={0.26}
          speed={1.4}
        />
      </mesh>
    </Float>
  )
}

/**
 * 화면 전체를 덮는 고정 3D 배경.
 * Canvas 는 클라이언트 전용(WebGL)이므로 항상 브라우저에서만 마운트된다.
 */
export function Experience() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0b0b0d']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 3]} intensity={2.2} />
      <directionalLight position={[-6, -2, -4]} intensity={0.6} color="#6c7cff" />
      <Suspense fallback={null}>
        <Artifact />
        <Environment preset="city" />
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.55} mipmapBlur />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
