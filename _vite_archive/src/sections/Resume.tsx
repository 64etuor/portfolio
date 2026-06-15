import { motion } from 'motion/react'
import { resume, fmtPeriod } from '@/data/resume'

export function ResumeSection() {
  return (
    <section id="resume" className="border-t border-line px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="font-serif text-4xl font-semibold text-ink md:text-5xl"
        >
          Resume
        </motion.h2>
        <p className="mt-3 text-sm text-muted">
          데이터 출처: <code className="text-ink/70">src/data/resume.json</code>{' '}
          (JSON Resume 표준)
        </p>

        {/* Experience */}
        <h3 className="mt-16 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Experience
        </h3>
        <div className="mt-8 space-y-10 border-l border-line pl-6 md:pl-10">
          {resume.work.map((job, i) => (
            <motion.div
              key={`${job.name}-${i}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative"
            >
              <span className="absolute -left-[31px] top-1.5 h-2 w-2 rounded-full bg-accent md:-left-[43px]" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h4 className="text-lg font-semibold text-ink">
                  {job.name}
                  <span className="ml-2 text-base font-normal text-muted">
                    {job.position}
                  </span>
                </h4>
                <span className="text-sm text-faint">
                  {fmtPeriod(job.startDate, job.endDate)}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {job.highlights?.map((h, j) => (
                  <li
                    key={j}
                    className="relative pl-4 text-sm leading-relaxed text-ink/70 before:absolute before:left-0 before:text-accent before:content-['–']"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Education + Languages + Certificates */}
        <div className="mt-20 grid gap-12 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Education
            </h3>
            <ul className="mt-6 space-y-4">
              {resume.education.map((e, i) => (
                <li key={i}>
                  <p className="font-semibold text-ink">{e.institution}</p>
                  <p className="text-sm text-muted">
                    {e.area} · {e.studyType}
                    {e.endDate ? ` · ${fmtPeriod(e.startDate, e.endDate)}` : ''}
                  </p>
                </li>
              ))}
            </ul>

            <h3 className="mt-10 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Languages
            </h3>
            <ul className="mt-6 space-y-2">
              {resume.languages.map((l, i) => (
                <li key={i} className="text-sm text-ink/70">
                  <span className="font-semibold text-ink">{l.language}</span>
                  {l.fluency ? ` — ${l.fluency}` : ''}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Courses &amp; Activities
            </h3>
            <ul className="mt-6 space-y-4">
              {resume.certificates.map((c, i) => (
                <li key={i}>
                  <p className="font-semibold text-ink">{c.name}</p>
                  {c.summary ? (
                    <p className="text-sm text-muted">{c.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
