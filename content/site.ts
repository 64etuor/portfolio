import { copy, type LocalizedString } from '@/i18n/content'

export type LocalizedNavItem = {
  href: string
  label: LocalizedString
}

/**
 * Site-wide interface copy. Content modules own factual portfolio data; this
 * catalog owns shared labels and routes so copy never drifts between pages.
 */
export const SITE = {
  metadata: {
    title: copy('박양하 · 포트폴리오', 'Yangha Park · Portfolio'),
    description: copy(
      '공정·데이터 엔지니어링부터 로컬-퍼스트 AI 워크플로우까지 직접 기획하고 구현한 포트폴리오.',
      'A portfolio of work personally planned and built, from process and data engineering to local-first AI workflows.',
    ),
  },
  pages: {
    scenes: copy('Scenes · 필름 서사 — Lab', 'Scenes · Film Narrative — Lab'),
    skills: copy('Skills · 영역별 실작업 — Lab', 'Skills · Hands-on Work by Area — Lab'),
    resume: copy('박양하 · 이력서', 'Yangha Park · Résumé'),
    projects: copy('Projects · 박양하', 'Projects · Yangha Park'),
  },
  domain: 'yanghapark.com',
  locale: {
    label: copy('언어 선택', 'Choose language'),
    korean: copy('한국어', 'Korean'),
    english: copy('영어', 'English'),
  },
  chrome: {
    home: copy('← 홈', '← Home'),
    print: copy('인쇄', 'Print'),
    open: copy('열기 ↗', 'Open ↗'),
    skipToContent: copy('본문으로 건너뛰기', 'Skip to content'),
    newTab: copy('새 탭 ↗', 'Open in new tab ↗'),
  },
  landing: {
    hero: [
      copy('포트폴리오', 'PORTFOLIO'),
      copy('바로 나입니다.', "It's me."),
      copy('양하 박', 'YANGHA PARK'),
      copy('더 나은 미래를 설계합니다', 'Designing an awesome future'),
    ] as const,
    ambientWords: [
      { word: copy('사랑', 'Love'), lum: 1 }, { word: copy('희망', 'Hope'), lum: 1 },
      { word: copy('평화', 'Peace'), lum: 0.92 }, { word: copy('서비스', 'Service'), lum: 0.7 },
      { word: copy('예술', 'Art'), lum: 0.6 }, { word: copy('음악', 'Music'), lum: 0.6 },
      { word: copy('철학', 'Philosophy'), lum: 0.42 }, { word: copy('문학', 'Literature'), lum: 0.42 },
      { word: copy('심리학', 'Psychology'), lum: 0.42 }, { word: copy('지식', 'Knowledge'), lum: 0.4 },
      { word: copy('디자인', 'Design'), lum: 0.36 }, { word: copy('기술', 'Technology'), lum: 0.22 },
      { word: copy('개발', 'Development'), lum: 0.22 }, { word: copy('운영', 'Management'), lum: 0.22 },
      { word: copy('인프라', 'Infrastructure'), lum: 0.22 }, { word: copy('데이터', 'Data'), lum: 0.22 },
      { word: copy('시스템', 'Systems'), lum: 0.22 }, { word: copy('제조', 'Manufacturing'), lum: 0.22 },
    ] as const,
    nav: [
      { href: '/film', label: copy('포트폴리오', 'Portfolio') },
      { href: '/s/gantt-cpm', label: copy('프로젝트', 'Projects') },
      { href: '/scenes', label: copy('씬', 'Scenes') },
      { href: '/skills', label: copy('스킬', 'Skills') },
      { href: '/resume', label: copy('이력서', 'Résumé') },
    ] as const satisfies readonly LocalizedNavItem[],
    navigation: copy('주요 탐색', 'Primary navigation'),
  },
  gallery: {
    previewUnavailable: copy('미리보기 없음', 'Preview unavailable'),
    openFullscreen: copy('전체화면으로 열기 ↗', 'Open full screen ↗'),
    scenes: {
      title: copy('Scenes · 필름 서사', 'Scenes · Film Narrative'),
      sub: copy('DX→AX 매니페스토 필름 — 부팅 + SCENE 01–10 + 엔딩을 서사 순서대로 봅니다. 미리보기는 화면에 보일 때만 재생됩니다. 각 카드에서 전체화면 인터랙션을 열고, 자동 재생 필름은 홈의 Portfolio에서 볼 수 있습니다.', 'The DX→AX manifesto film — boot, SCENE 01–10, and ending in narrative order. Previews play only when visible. Open each card for the full-screen interaction, or watch the auto-playing film from Portfolio on the home page.'),
      footer: copy('부팅 + SCENE 01–10 + 엔딩 · 미리보기는 뷰포트 진입 시 재생 · 자동 재생은 홈 → Portfolio.', 'Boot + SCENE 01–10 + ending · previews play on viewport entry · autoplay is at Home → Portfolio.'),
    },
    skills: {
      footer: copy('총 {count}종 · 영역별 페이지는 지연로딩(뷰포트 진입 시 미리보기 렌더).', '{count} pieces · area pages lazy-load previews when they enter the viewport.'),
      areaFooter: copy('{area} · {count}종', '{area} · {count} pieces'),
    },
  },
  project: {
    indexTitle: copy('직접 기획하고 구현한 것들', 'Work I planned and built'),
    keyOutcomes: copy('핵심 성과', 'Key outcomes'),
    workflow: copy('동작 흐름', 'How it works'),
    screens: copy('화면', 'Screens'),
    stack: copy('기술 스택', 'Technology stack'),
    backToTimeline: copy('↩ 간트로', '↩ Back to timeline'),
    navigation: copy('프로젝트 탐색', 'Project navigation'),
  },
  scene: {
    interactive: copy('박양하 포트폴리오 인터랙티브 씬.', 'Interactive scene from Yangha Park’s portfolio.'),
  },
  film: {
    previous: copy('이전', 'Previous'),
    play: copy('재생', 'Play'),
    pause: copy('일시정지', 'Pause'),
    skip: copy('건너뛰기 →', 'Skip →'),
  },
} as const
