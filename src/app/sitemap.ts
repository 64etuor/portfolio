import type { MetadataRoute } from 'next'
import { SKILL_AREAS } from '@/components/gallery/data'
import { SCENE_CATALOG } from '@/scenes/catalog'

const BASE = 'https://yanghapark.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const staticRoutes = ['', '/film', '/scenes', '/skills', '/resume'].map((path) => ({
    url: `${BASE}${path || '/'}`,
    lastModified,
  }))

  const skillRoutes = SKILL_AREAS.map((a) => ({
    url: `${BASE}/skills/${a.key}`,
    lastModified,
  }))

  const sceneRoutes = SCENE_CATALOG.map((s) => ({
    url: `${BASE}/s/${s.slug}`,
    lastModified,
  }))

  return [...staticRoutes, ...skillRoutes, ...sceneRoutes]
}
