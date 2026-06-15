import { motion } from 'motion/react'
import { Code, Mail, Phone, Globe } from 'lucide-react'
import { resume } from '@/data/resume'

export function Contact() {
  const { email, phone, url, profiles } = resume.basics
  const github = profiles?.find((p) => p.network === 'GitHub')

  return (
    <section
      id="contact"
      className="px-6 py-28 md:px-10 md:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="font-serif text-5xl font-semibold text-paper md:text-7xl"
        >
          Let&apos;s talk.
        </motion.h2>

        <div className="mt-12 flex flex-wrap gap-4">
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm text-paper/80 transition-colors hover:border-accent hover:text-paper"
            >
              <Mail size={16} /> {email}
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone.replace(/-/g, '')}`}
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm text-paper/80 transition-colors hover:border-accent hover:text-paper"
            >
              <Phone size={16} /> {phone}
            </a>
          )}
          {github && (
            <a
              href={github.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm text-paper/80 transition-colors hover:border-accent hover:text-paper"
            >
              <Code size={16} /> {github.username}
            </a>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm text-paper/80 transition-colors hover:border-accent hover:text-paper"
            >
              <Globe size={16} /> {url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        <p className="mt-20 text-xs text-faint">
          © {resume.basics.name} · Built with React Three Fiber · 데이터는 JSON
          Resume 로 관리됩니다.
        </p>
      </div>
    </section>
  )
}
