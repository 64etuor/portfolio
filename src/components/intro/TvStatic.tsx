'use client'

import { useEffect, useRef } from 'react'

/**
 * 진짜 아날로그 TV 스노우(지지직): 매 프레임 per-pixel 랜덤 노이즈를 저해상도로 그리고
 * pixelated 업스케일(거친 입자). + 롤링 sync 바 + 가끔 수평 찢김 + 스캔라인 + 비네트.
 */
export function TvStatic() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d', { alpha: true })
    if (!ctx) return

    let raf = 0
    let alive = true
    let roll = 0

    const W = 420 // 저해상도 내부(거친 스노우 + 성능)
    const resize = () => {
      const ar = window.innerHeight / Math.max(1, window.innerWidth)
      cv.width = W
      cv.height = Math.max(2, Math.round(W * ar))
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      if (!alive) return
      const w = cv.width
      const h = cv.height
      const img = ctx.createImageData(w, h)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        // 대부분 흑백 스노우, 드물게 살짝 컬러 스펙클
        let v = (Math.random() * 255) | 0
        if (Math.random() < 0.04) v = 255 // 밝은 반짝
        d[i] = v
        d[i + 1] = v
        d[i + 2] = v
        // 가끔 미세 컬러 노이즈
        if (Math.random() < 0.015) {
          d[i] = (Math.random() * 255) | 0
          d[i + 2] = (Math.random() * 255) | 0
        }
        d[i + 3] = 255
      }
      ctx.putImageData(img, 0, 0)

      // 수평 찢김(horizontal tear): 가끔 몇 줄을 좌우로 밀기
      if (Math.random() < 0.25) {
        const ty = (Math.random() * h) | 0
        const th = 2 + ((Math.random() * 6) | 0)
        const dx = ((Math.random() - 0.5) * w * 0.4) | 0
        try {
          const slice = ctx.getImageData(0, ty, w, Math.min(th, h - ty))
          ctx.putImageData(slice, dx, ty)
        } catch {
          /* ignore */
        }
      }

      // 롤링 sync 바(밝은 띠 + 아래 어두운 선)
      roll = (roll + h * 0.025) % (h + 60)
      const by = roll - 60
      const grad = ctx.createLinearGradient(0, by, 0, by + 44)
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(0.5, 'rgba(255,255,255,0.16)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, by, w, 44)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(0, by + 44, w, 2)

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <canvas
        ref={ref}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', opacity: 0.97 }}
      />
      {/* 스캔라인 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 1px, transparent 1px 3px)', mixBlendMode: 'multiply' }} />
      {/* 비네트 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 180px rgba(0,0,0,0.6)' }} />
    </div>
  )
}
