'use client'

import Link from 'next/link'
import { EN_PROJECTS, EN_RESUME } from '@content/i18n/portfolio-en'
import type { ResumeData } from '@content/resume'
import { ResumeDragonHero } from './ResumeDragonHero'
import { PretextHeading } from './PretextHeading'
import { ProjectDrawerHost } from '../projects/ProjectDrawerHost'
import { ProjectDetailLink } from '../projects/ProjectDetailLink'

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <section className="rz-section" id={id}><PretextHeading label={label} />{children}</section>
}

/** English-only projection of the canonical Korean résumé records. */
export function ResumeEnglish({ data }: { data: ResumeData }) {
  const { basics } = data
  const profiles = basics.profiles ?? []

  return (
    <main className="rz-root">
      <div className="rz-scan" aria-hidden />
      <div className="rz-vignette" aria-hidden />
      <ResumeDragonHero nameEn={EN_RESUME.name} nameKr={EN_RESUME.name} title={EN_RESUME.label} />
      <div className="rz-sheet">
        <header className="rz-masthead">
          <p className="rz-eyebrow">RÉSUMÉ <span className="rz-acc">{'//'}</span> CURRICULUM VITAE</p>
          <h1 className="rz-sr-only">{EN_RESUME.name} — {EN_RESUME.label}</h1>
          <div className="rz-hero-spacer" aria-hidden />
          <p className="rz-summary">{EN_RESUME.summary}</p>
          <ul className="rz-contact" aria-label="contact">
            <li><span className="rz-k">EMAIL</span><a href={`mailto:${basics.email}`}>{basics.email}</a></li>
            {profiles.map((profile) => <li key={profile.network}><span className="rz-k">{profile.network.toUpperCase()}</span><a href={profile.url} target="_blank" rel="noreferrer">{profile.url.replace(/^https?:\/\//, '')}</a></li>)}
            {basics.url ? <li><span className="rz-k">WEB</span><a href={basics.url} target="_blank" rel="noreferrer">{basics.url.replace(/^https?:\/\//, '')}</a></li> : null}
          </ul>
        </header>

        <Section id="cover-letter" label="COVER LETTER">
          <div className="rz-cover">
            <p className="rz-cl-to">{EN_RESUME.coverLetter.to}</p>
            <div className="rz-cl-body">{EN_RESUME.coverLetter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <p className="rz-cl-signoff">{EN_RESUME.coverLetter.signOff}<span className="rz-cl-sign">— {EN_RESUME.name}</span></p>
          </div>
        </Section>

        <Section id="experience" label="EXPERIENCE">
          <ol className="rz-timeline">
            {EN_RESUME.work.map((work) => <li className="rz-entry" key={work.name}>
              <div className="rz-entry-head"><div><h3 className="rz-entry-title">{work.name}</h3><p className="rz-entry-role">{work.position}</p></div><span className="rz-period">{work.period}</span></div>
              <p className="rz-entry-sum">{work.summary}</p>
              <ul className="rz-bullets">{work.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
            </li>)}
          </ol>
        </Section>

        <Section id="projects" label="SELECTED PROJECTS">
          <p className="rz-projects-lead">Project background, implementation, and outcomes are documented with supporting detail. <Link className="rz-inline-link" href="/projects">View all project details →</Link></p>
          <div className="rz-projects">
            {Object.entries(EN_PROJECTS).map(([slug, project]) => <article className="rz-card" key={slug}>
              <div className="rz-card-head"><ProjectDetailLink slug={slug} className="rz-card-title rz-card-title-link">{project.hero.title}</ProjectDetailLink><span className="rz-card-org">{project.hero.company}</span></div>
              <p className="rz-card-role">{project.hero.role}</p><p className="rz-card-desc">{project.summary}</p>
              <ul className="rz-bullets rz-bullets-sm">{project.sections.slice(1).map((item) => <li key={item.heading}>{item.heading}: {item.body.replaceAll('**', '').replaceAll('\n', ' ')}</li>)}</ul>
              <ProjectDetailLink slug={slug} className="rz-card-detail">View project details →</ProjectDetailLink>
            </article>)}
          </div>
        </Section>

        <Section id="skills" label="SKILLS"><div className="rz-skills">{EN_RESUME.skills.map((skill) => <div className="rz-skill-group" key={skill.name}><h3 className="rz-skill-name">{skill.name}</h3><ul className="rz-chips rz-chips-quiet">{skill.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}</ul></div>)}</div></Section>

        <Section id="education" label="EDUCATION"><ul className="rz-list">{EN_RESUME.education.map((education) => <li className="rz-list-row" key={education.title}><div><p className="rz-list-title">{education.title}</p><p className="rz-list-sub">{education.subtitle}</p></div></li>)}</ul></Section>
        <footer className="rz-foot"><span>{EN_RESUME.name}</span><span className="rz-foot-sep">·</span><span>ASCII dragon &amp; layout ported from pretext-playground (MIT)</span></footer>
      </div>
      <ProjectDrawerHost />
    </main>
  )
}
