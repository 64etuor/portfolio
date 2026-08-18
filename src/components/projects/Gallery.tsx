import type { GalleryItem } from '@content/projects/types'

/** Lazy screenshot gallery. Plain <img loading="lazy"> to match repo convention
    (the app does not use next/image). */
export function Gallery({ items }: { items: GalleryItem[] }) {
  if (!items?.length) return null
  return (
    <div className="pj-gallery">
      {items.map((g, i) => (
        <figure className="pj-fig" key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.src} alt={g.caption ?? ''} loading="lazy" decoding="async" />
          {g.caption ? <figcaption className="pj-cap">{g.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  )
}
