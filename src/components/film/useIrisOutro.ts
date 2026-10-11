import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * useIrisOutro — the ended→iris animation→router.push('/') effect.
 *
 * On the final beat the whole frame collapses into a single point at center
 * (iris-out), then we navigate. The landing reveals from black, so the film hands
 * off to the home page as one continuous shot (no abrupt cut). Returns the ref to
 * attach to the iris aperture element.
 */
export function useIrisOutro(ended: boolean): React.RefObject<HTMLDivElement | null> {
  const router = useRouter()
  const irisRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ended) return
    const el = irisRef.current
    const DUR = 860
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / DUR)
      if (el) {
        const e = k * k // ease-in: accelerate as the image is sucked into the point
        const size = (1 - e) * 170 // vmax — transparent aperture shrinking toward 0
        el.style.width = `${size}vmax`
        el.style.height = `${size}vmax`
        const glow = k > 0.78 ? 1 - (k - 0.78) / 0.22 : 0 // bright pinpoint near the end
        el.style.boxShadow = `0 0 ${(26 * glow).toFixed(1)}px ${(7 * glow).toFixed(1)}px rgba(255,255,255,${(glow * 0.9).toFixed(2)}), 0 0 0 100vmax #000`
      }
      if (k < 1) raf = requestAnimationFrame(tick)
      else {
        // Same document: the landing veil reads this and fades in as the iris lands.
        document.documentElement.dataset.fromFilm = '1'
        router.push('/')
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ended, router])

  return irisRef
}
