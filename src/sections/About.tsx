import { motion } from 'motion/react'
import { resume } from '@/data/resume'

export function About() {
  return (
    <section id="about" className="px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_2fr]">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="font-serif text-4xl font-semibold text-ink md:text-5xl"
        >
          About
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="text-xl leading-relaxed text-ink/80 md:text-2xl">
            {resume.basics.summary}
          </p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {resume.skills.map((group) => (
              <div key={group.name} className="bg-paper-2 p-6">
                <h3 className="text-sm font-semibold text-accent">
                  {group.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {group.keywords?.join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
