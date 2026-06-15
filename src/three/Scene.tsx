import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  CuboidCollider,
  RigidBody,
  type RapierRigidBody,
  type RigidBodyAutoCollider,
} from '@react-three/rapier'
import * as THREE from 'three'

const _v = new THREE.Vector3()
const _dir = new THREE.Vector3()

/** 포인터로 집어 끌 수 있는 강체. 잡으면 kinematic, 놓으면 dynamic 으로 복귀. */
function Draggable({
  children,
  position,
  colliders = 'hull',
}: {
  children: ReactNode
  position: [number, number, number]
  colliders?: RigidBodyAutoCollider
}) {
  const rb = useRef<RapierRigidBody>(null)
  const [dragged, setDragged] = useState(false)
  const { camera, pointer, gl } = useThree()

  // 드래그 중에는 어디서 손을 떼도 해제되도록 전역 pointerup 을 듣는다.
  useEffect(() => {
    if (!dragged) return
    const up = () => setDragged(false)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [dragged])

  useFrame(() => {
    if (!dragged || !rb.current) return
    // 정규화 포인터(-1..1) → z=0 평면 위의 월드 좌표
    _v.set(pointer.x, pointer.y, 0.5).unproject(camera)
    _dir.copy(_v).sub(camera.position).normalize()
    const dist = -camera.position.z / _dir.z
    _v.copy(camera.position).add(_dir.multiplyScalar(dist))
    rb.current.setNextKinematicTranslation({ x: _v.x, y: _v.y, z: 0 })
  })

  // 로드 시 살짝 떠다니도록 작은 초기 속도
  const v0: [number, number, number] = [
    (position[0] % 2) - 1,
    (position[1] % 2) - 1,
    0,
  ]

  return (
    <RigidBody
      ref={rb}
      position={position}
      colliders={colliders}
      restitution={0.55}
      friction={0.5}
      linearDamping={0.55}
      angularDamping={0.4}
      linearVelocity={v0}
      type={dragged ? 'kinematicPosition' : 'dynamic'}
    >
      <group
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setDragged(true)
          gl.domElement.style.cursor = 'grabbing'
        }}
        onPointerUp={() => {
          gl.domElement.style.cursor = 'grab'
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          if (!dragged) gl.domElement.style.cursor = 'auto'
        }}
      >
        {children}
      </group>
    </RigidBody>
  )
}

/** 오브젝트가 화면 밖으로 날아가지 않도록 보이지 않는 박스 경계. */
function Bounds() {
  const t = 0.5
  const X = 8.5
  const Y = 4.8
  const Z = 2.5
  return (
    <RigidBody type="fixed" colliders={false} restitution={0.6}>
      <CuboidCollider args={[X, t, Z]} position={[0, Y, 0]} />
      <CuboidCollider args={[X, t, Z]} position={[0, -Y, 0]} />
      <CuboidCollider args={[t, Y, Z]} position={[X, 0, 0]} />
      <CuboidCollider args={[t, Y, Z]} position={[-X, 0, 0]} />
      <CuboidCollider args={[X, Y, t]} position={[0, 0, Z]} />
      <CuboidCollider args={[X, Y, t]} position={[0, 0, -Z]} />
    </RigidBody>
  )
}

function mat(color: string, opts: Partial<{ metal: number; rough: number }> = {}) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={opts.metal ?? 0.1}
      roughness={opts.rough ?? 0.45}
    />
  )
}

export function Scene() {
  return (
    <>
      <Bounds />

      <Draggable position={[-5, 2.5, 0]} colliders="ball">
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1.1, 48, 48]} />
          {mat('#e07a5f', { rough: 0.35 })}
        </mesh>
      </Draggable>

      <Draggable position={[-1.5, 1, 0]} colliders="hull">
        <mesh castShadow receiveShadow rotation={[0.4, 0.2, 0]}>
          <torusKnotGeometry args={[0.7, 0.26, 160, 24]} />
          {mat('#f2cc8f', { metal: 0.85, rough: 0.2 })}
        </mesh>
      </Draggable>

      <Draggable position={[3, 2, -0.5]} colliders="cuboid">
        <mesh castShadow receiveShadow rotation={[0.3, 0.5, 0.1]}>
          <boxGeometry args={[1.7, 1.7, 1.7]} />
          {mat('#3d405b', { rough: 0.5 })}
        </mesh>
      </Draggable>

      <Draggable position={[5.5, -1, 0]} colliders="hull">
        <mesh castShadow receiveShadow>
          <icosahedronGeometry args={[1.2, 0]} />
          {mat('#81b29a', { rough: 0.4 })}
        </mesh>
      </Draggable>

      <Draggable position={[0.5, -2.5, 0.5]} colliders="hull">
        <mesh castShadow receiveShadow rotation={[1.2, 0, 0]}>
          <capsuleGeometry args={[0.6, 1.2, 12, 24]} />
          {mat('#f1ede3', { rough: 0.3 })}
        </mesh>
      </Draggable>

      <Draggable position={[-4, -2, -0.5]} colliders="ball">
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.8, 48, 48]} />
          {mat('#1b1a16', { metal: 0.2, rough: 0.35 })}
        </mesh>
      </Draggable>

      <Draggable position={[-2.5, -0.5, 0.8]} colliders="hull">
        <mesh castShadow receiveShadow rotation={[0.5, 0.3, 0]}>
          <torusGeometry args={[0.85, 0.32, 24, 64]} />
          {mat('#e07a5f', { metal: 0.6, rough: 0.3 })}
        </mesh>
      </Draggable>

      <Draggable position={[2.5, -0.5, 0.6]} colliders="ball">
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          {mat('#f2cc8f', { rough: 0.45 })}
        </mesh>
      </Draggable>
    </>
  )
}
