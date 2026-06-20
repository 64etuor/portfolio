'use client'

// 서버 라우트(/s, /c)에서 문자열 키만 넘겨 React 씬을 마운트하는 클라이언트 래퍼.
// (loader 함수는 서버→클라 경계를 못 넘으므로 키로 조회한다.)
import { SceneFrame } from './SceneFrame'
import { loaderFor } from '../loaders'

export function SceneMount({
  name,
  title,
  bg,
}: {
  name: string // 씬 디렉토리명 또는 "<name>.html"
  title: string
  bg?: string
}) {
  const load = loaderFor(name)
  if (!load) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 12 }}>
        no React scene for “{name}”
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneFrame load={load} title={title} bg={bg} keepMounted />
    </div>
  )
}
