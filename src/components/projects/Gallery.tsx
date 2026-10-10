import Image from 'next/image'
import type { GalleryItem } from '@content/projects/types'
import { IMAGE_DIMS } from './imageDims'

/** Lazy screenshot gallery via next/image: intrinsic width/height reserve layout
    space (no CLS) and the optimizer serves AVIF/WebP at the rendered width instead
    of the ~2000px source PNGs. Items whose file failed to decode at dims-generation
    time (absent from IMAGE_DIMS) are skipped rather than shown as broken images. */
export function Gallery({ items }: { items: GalleryItem[] }) {
  const shown = (items ?? []).filter((g) => IMAGE_DIMS[g.src])
  if (!shown.length) return null
  return (
    <div className="pj-gallery">
      {shown.map((g) => {
        const [width, height] = IMAGE_DIMS[g.src]
        return (
          <figure className="pj-fig" key={g.src}>
            <Image
              src={g.src}
              alt={g.caption ?? ''}
              width={width}
              height={height}
              sizes="(max-width: 960px) 100vw, 880px"
            />
            {g.caption ? <figcaption className="pj-cap">{g.caption}</figcaption> : null}
          </figure>
        )
      })}
    </div>
  )
}
