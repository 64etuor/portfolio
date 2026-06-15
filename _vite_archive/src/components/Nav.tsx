const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#resume', label: 'Resume' },
  { href: '#contact', label: 'Contact' },
]

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <a
          href="#top"
          className="font-serif text-xl font-semibold tracking-wide text-ink mix-blend-multiply"
        >
          Park&nbsp;Yangha
        </a>
        <ul className="flex items-center gap-7 text-sm font-medium text-muted">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
