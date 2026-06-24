'use client'

import { useEffect, type RefObject } from 'react'

/** 펜던트 본체(.device)는 1320px 고정폭이라 모바일에서 SceneHost 의 generic
 *  useFitWidth 가 정렬 불명(중앙정렬 자기-스케일)으로 스킵한다 → 화면 밖으로 넘침.
 *  .device 에는 이미 `transform: scale(var(--fit,1))` (origin center) 가 박혀 있으나
 *  --fit 을 아무도 세팅하지 않는다. 여기서 호스트(SceneHost 루트=.device 부모) 폭을
 *  관측해 --fit = min(1, hostW/1320) 을 직접 세팅한다. 데스크톱(폭≥1320)에선 1 → 무변화. */
const NATURAL_W = 1320

export function useFitDevice(deviceRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const device = deviceRef.current
    const host = device?.parentElement
    if (!device || !host) return

    let raf = 0
    const apply = () => {
      raf = 0
      const w = host.clientWidth
      if (!w) return
      const fit = Math.min(1, w / NATURAL_W)
      device.style.setProperty('--fit', String(fit))
    }
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(apply)
    }

    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(host)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      device.style.removeProperty('--fit')
    }
  }, [deviceRef])
}
