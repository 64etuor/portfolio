import type { MetadataRoute } from 'next'
import { SKILL_AREAS } from '@/components/gallery/data'
import { SCENE_CATALOG } from '@/scenes/catalog'
import { enabledProjects } from '@content/projects'

const BASE = 'https://yanghapark.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const staticRoutes = ['', '/film', '/scenes', '/skills', '/resume', '/projects'].map((path) => ({
    url: `${BASE}${path || '/'}`,
    lastModified,
  }))

  const projectRoutes = enabledProjects().map((p) => ({
    url: `${BASE}/projects/${p.slug}`,
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

  return [...staticRoutes, ...projectRoutes, ...skillRoutes, ...sceneRoutes]
}
