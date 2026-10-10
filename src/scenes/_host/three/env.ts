import type * as THREE_NS from 'three'
import type { ThreeContext } from './types'

/**
 * RoomEnvironment PMREM 환경맵 — 탭 전체에서 한 번만 굽는다.
 *
 * PMREMGenerator.fromScene 은 큐브 6면 렌더 + 블러 패스 + 전용 셰이더 동기 컴파일이라
 * 씬 초기화 비용의 큰 몫이다(필름에선 다른 씬이 재생되는 중에 다음 씬이 스테이징되며 이 비용이
 * 재생 중인 씬을 끊는다). 텍스처는 WebGL 컨텍스트에 묶여 공유가 안 되므로, 처음 구운 결과를
 * CPU 로 읽어(HalfFloat cubeUV 아틀라스, 수백 KB) 모듈에 캐시하고 이후 씬은 DataTexture 업로드만 한다.
 * 결과는 같은 cubeUV 텍스처라 셰이더 경로·그림이 동일하다.
 */
interface EnvData {
  data: Uint16Array
  w: number
  h: number
}
const cache = new Map<number, EnvData>()

export interface EnvHandle {
  texture: THREE_NS.Texture
  dispose(): void
}

export async function roomEnvironment(ctx: ThreeContext, sigma = 0.04): Promise<EnvHandle> {
  const { THREE, renderer } = ctx
  const hit = cache.get(sigma)
  if (hit) {
    const tex = new THREE.DataTexture(hit.data, hit.w, hit.h, THREE.RGBAFormat, THREE.HalfFloatType)
    tex.mapping = THREE.CubeUVReflectionMapping
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    tex.colorSpace = THREE.LinearSRGBColorSpace
    tex.name = 'PMREM.cubeUv.cached'
    tex.needsUpdate = true
    return { texture: tex, dispose: () => tex.dispose() }
  }
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const rt = pmrem.fromScene(room, sigma)
  room.dispose()
  pmrem.dispose()
  // 비동기 읽기(PBO + 펜스) — 동기 readPixels 는 GPU 가 PMREM 렌더를 끝낼 때까지 메인 스레드를 세운다.
  // 캐시는 다음 씬부터 쓰이므로 기다리지 않는다. 그동안 RT 가 해제되지 않게 dispose 를 미룬다.
  let reading = true
  let disposeRequested = false
  const { width: w, height: h } = rt
  const data = new Uint16Array(w * h * 4)
  renderer
    .readRenderTargetPixelsAsync(rt, 0, 0, w, h, data)
    .then(() => {
      // 읽기 실패(포맷 미지원 → 전부 0) 면 캐시하지 않는다.
      for (let i = 0; i < data.length; i += 97) {
        if (data[i] !== 0) {
          if (!cache.has(sigma)) cache.set(sigma, { data, w, h })
          break
        }
      }
    })
    .catch(() => {
      /* 캐시 없이 진행 */
    })
    .finally(() => {
      reading = false
      if (disposeRequested) rt.dispose()
    })
  return {
    texture: rt.texture,
    dispose: () => {
      if (reading) disposeRequested = true
      else rt.dispose()
    },
  }
}
