import { motion } from 'motion/react'
import { resume } from '@/data/resume'

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex h-screen flex-col justify-center px-6 md:px-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-accent"
        >
          Production Operations · Process Engineering · Product
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08 }}
          className="mt-5 font-serif text-[18vw] leading-[0.9] font-semibold text-paper md:text-[12rem]"
        >
          Park Yangha
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 max-w-xl text-base text-paper/70 md:text-lg"
        >
          {resume.basics.label}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="absolute inset-x-0 bottom-8 flex justify-center"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-muted">
          Scroll
        </span>
      </motion.div>
    </section>
  )
}
