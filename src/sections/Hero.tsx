import { motion } from 'motion/react'
import { resume } from '@/data/resume'

/**
 * 3D 캔버스 위에 얹히는 오버레이.
 * pointer-events-none 이라 클릭/드래그는 뒤의 3D 로 통과된다.
 */
export function HeroOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-10">
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mx-auto w-full max-w-6xl text-xs font-semibold uppercase tracking-[0.28em] text-accent"
      >
        Production Operations · Process Engineering · Product
      </motion.p>

      <div className="mx-auto w-full max-w-6xl">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="font-serif text-[19vw] leading-[0.86] font-semibold text-ink mix-blend-multiply md:text-[12rem]"
        >
          Park
          <br />
          Yangha
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-4 max-w-md text-base text-ink/70 md:text-lg"
        >
          {resume.basics.label}
        </motion.p>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="text-center text-xs uppercase tracking-[0.28em] text-muted"
      >
        오브젝트를 끌어보세요 · Scroll ↓
      </motion.p>
    </div>
  )
}
