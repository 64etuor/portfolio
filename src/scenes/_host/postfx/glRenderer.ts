import { FRAG_SRC, VERT_SRC } from './shader'
import type { PresetUniforms } from './types'

export interface GlPostFX {
  /** CSS px + dpr 로 캔버스 픽셀버퍼·뷰포트 리사이즈. */
  resize(wCss: number, hCss: number, dpr: number): void
  /** source(offscreen 2D 캔버스 등)를 텍스처로 받아 한 프레임 후처리 렌더. */
  render(source: TexImageSource, timeSec: number): void
  /** GL 리소스 해제 + 리스너 제거. */
  dispose(): void
  /** 컨텍스트 로스 상태. true 면 호출부가 2D 폴백으로 전환해야 한다. */
  readonly lost: boolean
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[postfx] shader compile failed:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/** webgl2 컨텍스트를 잡아 후처리 파이프라인을 만든다. 불가 시 null. */
export function createGlPostFX(
  canvas: HTMLCanvasElement,
  uniforms: PresetUniforms
): GlPostFX | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  })
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vs || !fs) return null

  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.bindAttribLocation(prog, 0, 'aPos')
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[postfx] program link failed:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  // 풀스크린 트라이앵글(쿼드보다 1드로우 효율).
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  // 캔버스 텍스처는 좌상단 원점 — Y 뒤집어 vUv 와 맞춘다.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  const loc = {
    tex: gl.getUniformLocation(prog, 'uTex'),
    res: gl.getUniformLocation(prog, 'uResolution'),
    time: gl.getUniformLocation(prog, 'uTime'),
    curvature: gl.getUniformLocation(prog, 'uCurvature'),
    aberration: gl.getUniformLocation(prog, 'uAberration'),
    bloom: gl.getUniformLocation(prog, 'uBloom'),
    scanline: gl.getUniformLocation(prog, 'uScanline'),
    grain: gl.getUniformLocation(prog, 'uGrain'),
    vignette: gl.getUniformLocation(prog, 'uVignette'),
    tint: gl.getUniformLocation(prog, 'uTint'),
  }

  let lost = false
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onLost, false)

  let pxW = 1
  let pxH = 1

  return {
    get lost() {
      return lost
    },
    resize(wCss, hCss, dpr) {
      pxW = Math.max(1, Math.round(wCss * dpr))
      pxH = Math.max(1, Math.round(hCss * dpr))
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW
        canvas.height = pxH
      }
      canvas.style.width = wCss + 'px'
      canvas.style.height = hCss + 'px'
      gl.viewport(0, 0, pxW, pxH)
    },
    render(source, timeSec) {
      if (lost) return
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      gl.uniform1i(loc.tex, 0)
      gl.uniform2f(loc.res, pxW, pxH)
      gl.uniform1f(loc.time, timeSec)
      gl.uniform1f(loc.curvature, uniforms.curvature)
      gl.uniform1f(loc.aberration, uniforms.aberration)
      gl.uniform1f(loc.bloom, uniforms.bloom)
      gl.uniform1f(loc.scanline, uniforms.scanline)
      gl.uniform1f(loc.grain, uniforms.grain)
      gl.uniform1f(loc.vignette, uniforms.vignette)
      gl.uniform3f(loc.tint, uniforms.tint[0], uniforms.tint[1], uniforms.tint[2])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost, false)
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog)
    },
  }
}
