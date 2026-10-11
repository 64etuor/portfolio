'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { Locale } from '@/i18n/content'

/**
 * English copy for the interactive scene layer.
 *
 * Scene modules deliberately keep their Korean source copy next to the visual
 * choreography.  Centralising the English projection here keeps that source
 * intact, preserves Korean as the default experience, and lets imperative DOM
 * updates (status readouts, SVG labels, and animated captions) follow the
 * selected interface language without duplicating every scene implementation.
 */
const BASE_EN: Record<string, string> = {
  // Film narrative
  'SCENE 01 · 시대 — THE ACCELERATION': 'SCENE 01 · ERA — THE ACCELERATION',
  '시대는 빠르게 변하고 있습니다': 'The world is changing fast.',
  '변화의 속도 · 가속': 'Rate of change · acceleration',
  'SCENE 02 · 선언 — AX ERA': 'SCENE 02 · DECLARATION — AX ERA',
  '선언 — DX': 'Declaration — DX',
  '전환 — AX로': 'Transition — to AX',
  '부상 — 데이터·지식': 'Emergence — data · knowledge',
  '새 시대 — AX': 'A new era — AX',
  '를': '',
  '넘어': '',
  '의 시대.': ' era.',
  '이제 제조업의 경쟁력은': 'Manufacturing advantage now begins with ',
  '데이터': 'data',
  '지식': 'knowledge',
  '에서 시작됩니다.': '.',
  '제조 · 설비 · 공정': 'Manufacturing · equipment · process',
  '데이터 · 지식': 'Data · knowledge',
  '제조 · 설비 · 공정 — 물성(기반)': 'Manufacturing · equipment · process — physical foundation',
  '데이터 · 지식 — 경쟁력(상층)': 'Data · knowledge — competitive layer',
  'SCENE 03 · 현실 — THE DIVERGENCE': 'SCENE 03 · REALITY — THE DIVERGENCE',
  '많은 기업들이 ': 'Many companies invest in ',
  '디지털 전환': 'digital transformation',
  '에\n투자합니다.': '.',
  '에 투자합니다.': '.',
  '하지만 ': 'But ',
  '기대만큼의 ': 'they often do not achieve the expected ',
  '성과': 'outcome',
  '를\n내지 못하는 경우가 많습니다.': '.',
  '를 내지 못하는 경우가 많습니다.': '.',
  '기대': 'expectation',
  '격차': 'gap',
  '투자 누적 · 시간  →': 'Cumulative investment · time  →',
  '성과  ↑': 'Outcome  ↑',
  'SCENE 04 · 소통 — LOST IN TRANSLATION': 'SCENE 04 · COMMUNICATION — LOST IN TRANSLATION',
  '왜': 'Why',
  '시스템': 'system',
  '구축은': 'delivery',
  '늘': 'always',
  '어려울까요?': 'so difficult?',
  '기술의': 'a technology',
  '문제가': 'problem',
  '아니라,': 'but',
  '소통의': 'a communication',
  '문제일': 'problem',
  '수': 'may',
  '있습니다.': 'be.',
  '질문': 'QUESTION',
  '번역': 'TRANSLATING',
  '해체': 'DECODING',
  '소통': 'COMMUNICATION',
  '신호 정합': 'Signal alignment',
  'SCENE 05 · 관점 — PERSPECTIVES': 'SCENE 05 · PERSPECTIVES',
  '실무자 관점 · FIELD EXPERT': 'Field-expert perspective',
  '현업은 ': 'Field experts understand ',
  '업무': 'the work',
  '를 가장 잘 압니다.': ' best.',
  '하지만': 'But',
  '시스템 언어': 'the language of systems',
  '와': ' and ',
  '개발 프로세스': 'development processes',
  '는 ': 'can feel ',
  '낯설게': 'unfamiliar',
  ' 느껴집니다.': '.',
  '개발자는 ': 'Developers understand ',
  '기술': 'technology',
  '을 가장 잘 압니다.': ' best.',
  '하지만 제조': 'But manufacturing',
  '현장': 'the field',
  '의 복잡한 업무와': "'s complex work and",
  '경험': 'experience',
  '은 ': 'are ',
  '알기 어렵습니다.': 'hard to know.',
  '두 관점은 서로를 ': 'The two perspectives do not ',
  '완전히': 'fully',
  ' 알지 못합니다 — 그래서 ': ' understand one another — so we need ',
  '잇는 사람': 'a connector',
  '이 필요합니다': '.',
  'SCENE 06 · 충돌 — LEXICAL COLLISION': 'SCENE 06 · COLLISION — LEXICAL COLLISION',
  '서로 다른 언어를 사용하는 순간,': 'The moment we use different languages,',
  '요구사항은 왜곡되고 프로젝트는 멀어집니다.': 'requirements distort and the project drifts away.',
  '요구사항 무결성': 'Requirement integrity',
  '현업 · 제조': 'Field · manufacturing',
  '개발 · 시스템': 'Development · systems',
  'SCENE 07 · 비용 — COST CASCADE': 'SCENE 07 · COST — COST CASCADE',
  ' · 비용 — COST CASCADE': ' · COST — COST CASCADE',
  ' · 충돌 — LEXICAL COLLISION': ' · COLLISION — LEXICAL COLLISION',
  '커뮤니케이션 오류는 곧 ': 'Communication errors quickly become ',
  '비용': 'cost',
  '이 됩니다.': '.',
  '결함점 · 커뮤니케이션 오류': 'Fault point · communication error',
  '일정 지연': 'Schedule delay',
  '기능 미스매치': 'Feature mismatch',
  '현장 불만족': 'Field dissatisfaction',
  '한 점의 어긋남이': 'One misalignment',
  '세 갈래의 비용': 'becomes three kinds of cost',
  '으로 이어집니다.': '.',
  'SCENE 08 · 연결 — THE CONNECTOR': 'SCENE 08 · CONNECTION — THE CONNECTOR',
  '현장 ↔ 기술 · 단절': 'Field ↔ technology · disconnected',
  '연결선 전개 중': 'Connection forming',
  '연결 — 동기화': 'Connected — synchronised',
  '연결 유지 · 잔광': 'Connection held · afterglow',
  'FIELD · 공정·설비·사람': 'FIELD · process · equipment · people',
  'TECH · 데이터·AI·시스템': 'TECH · data · AI · systems',
  '성공적인 DX·AX의 핵심은 기술이 ': 'The key to successful DX and AX is not technology.',
  '아닙니다.': 'not technology.',
  '현장과 기술을 ': 'It is the person who ',
  '연결': 'connects',
  '하는 ': '',
  '사람': 'the field and technology.',
  '입니다.': '',
  'SCENE 09 · 해결 — THE BRIDGE': 'SCENE 09 · SOLUTION — THE BRIDGE',
  '제조 ∞ 디지털': 'MANUFACTURING ∞ DIGITAL',
  'ONE MIND · 양손잡이': 'ONE MIND · cross-functional',
  '양방향으로 이해하는 한 사람': 'One person who understands both directions',
  '제조를 이해하는 디지털 전문가.': 'A digital expert who understands manufacturing.',
  '그리고 디지털을 이해하는 제조 전문가.': 'And a manufacturing expert who understands digital.',
  '제조': 'manufacturing',
  '디지털': 'digital',
  '전문가': 'expert',
  '그리고': 'And',
  '한 사람': 'one person',
  'SCENE 10 · 핵심 — CROSS-DOMAIN': 'SCENE 10 · CORE — CROSS-DOMAIN',
  '제조 ⟡ IT': 'MANUFACTURING ⟡ IT',
  '제조\u00a0': 'Manufacturing\u00a0',
  '크로스 도메인 지식이 ': 'Cross-domain knowledge becomes ',
  '경쟁력': 'competitive advantage',
  '이 되는 시대.': '.',
  '제조와 IT의 ': 'The people who understand the ',
  '경계': 'boundary',
  '를 이해하는 사람이 ': ' between manufacturing and IT',
  '변화': 'shape change',
  '를 만듭니다.': '.',
  '교집합': 'intersection',
  '엔딩 · 수렴': 'ENDING · CONVERGENCE',
  '신호 정렬': 'Signal alignment',
  '수렴': 'Convergence',
  '결정': 'Decision',
  '다음으로 →': 'Next →',
  '제조와 ': 'The people connecting ',
  'IT를 ': 'manufacturing and IT',
  '잇는': 'connect',
  '미래': 'the future',
  '를 만드는 사람.': '.',
  '제조 × IT': 'MANUFACTURING × IT',
  '다음으로 ↗': 'Next ↗',

  // Composition controls and messages.
  '전체 투어 (4관점)': 'Full Tour (Four Perspectives)',
  '프로젝트 + 경력': 'Projects + Experience',
  '스킬': 'Skills',
  '철학': 'Philosophy',
  '지식관리': 'Knowledge Management',
  '프로젝트+경력 → 스킬 → 철학 → 지식관리. 한 사람을 보는 네 각도.': 'Projects and experience → skills → philosophy → knowledge management. Four views of one person.',
  '스타트업/개인 제품과 제조 3社 경력 — 실제로 성과를 낸 것.': 'Startup and independent products alongside experience at three manufacturers — work that delivered real outcomes.',
  '공정기술부터 데이터 모델링까지 — 어떻게 만드는가.': 'From process engineering to data modelling — how the work gets built.',
  '크로스도메인·품질·위임 — 왜 그렇게 일하는가.': 'Cross-domain work, quality, and delegation — why the work is done this way.',
  '지식을 운영 시스템으로 — 거버넌스·결정·검색.': 'Knowledge as an operating system — governance, decisions, and retrieval.',
  '이전': 'Previous',
  '다음': 'Next',
  '단독 보기 ↗': 'Open separately ↗',
  // Shared scene and technical-interface terminology.
  '새 탭 ↗': 'Open in new tab ↗',
  '호버 시 재생': 'Play on hover',
  '로딩 중': 'Loading',
  '오류': 'Error',
  '확인필요': 'review required',
  '정지됨': 'Stopped',
  '연속 취득': 'Continuous acquisition',
  '스패터 검출': 'spatter detected',
  '통전 중 용융금속 비산 — 해당 타점 플래그 / 전류 서지': 'Molten-metal expulsion during welding — flag this spot / current surge',
  'DOE LOCK: 진폭×가압력×용착시간 최적점 · 불량율 로브 냉각': 'DOE LOCK: optimum amplitude × pressure × weld time · defect lobe cooling',
  '전류 서지': 'current surge',
  '작업': 'work',
  '공정': 'process',
  '설비': 'equipment',
  '품질': 'quality',
  '계측': 'metrology',
  '양산': 'production',
  '수율': 'yield',
  '금형': 'tooling',
  '불량률': 'defect rate',
  '납기': 'lead time',
  '검사': 'inspection',
  '로트': 'lot',
  '배포': 'deploy',
  '구현': 'build',
  '설계': 'design',
  '요구사항': 'requirements',
  '충돌': 'COLLISION',
  '해결': 'SOLUTION',
  '핵심': 'CORE',
  '의': '',
  '초음파 용착': 'Ultrasonic Welding',
  'Nd:YAG 레이저 용접': 'Nd:YAG Laser Welding',
  '스팟 용접 검사': 'Spot-weld Inspection',
  '적층제조': 'Additive Manufacturing',
  'CMM 정밀 측정': 'CMM Precision Measurement',
  '토폴로지': 'Topology',
  '모델링': 'Modelling',
  '에이전트 거버넌스': 'Agent Governance',
  '코드': 'Code',
  '코딩': 'Coding',
  '아키텍처': 'Architecture',
}

/**
 * The live dictionary. Starts with the shared film/composition copy above;
 * each scene module registers its own projection (`registerSceneText`) when its
 * chunk loads, so per-scene copy is code-split with the scene that uses it.
 */
const EN: Record<string, string> = { ...BASE_EN }
let sortedSources: string[] | null = null
const memo = new Map<string, string>()
let dictionaryVersion = 0
const dictionaryListeners = new Set<() => void>()

/** Adds English projections for a scene's Korean source copy. Idempotent. */
export function registerSceneText(entries: Record<string, string>) {
  let changed = false
  for (const [source, translation] of Object.entries(entries)) {
    if (EN[source] === translation) continue
    EN[source] = translation
    changed = true
  }
  if (!changed) return
  sortedSources = null
  memo.clear()
  dictionaryVersion++
  dictionaryListeners.forEach((listener) => listener())
}

const originals = new WeakMap<Text, string>()
const rendered = new WeakMap<Text, string>()
const attributes = new WeakMap<Element, Map<string, string>>()

// Matches any Hangul syllable or compatibility jamo. Scene canvases redraw their
// text every frame (via localizeCanvasText below) and call this on every draw —
// most of those strings (numbers, already-English HUD labels, glyphs) contain no
// Korean at all, so this is a cheap bailout before the expensive dictionary scan.
const HAS_HANGUL = /[ㄱ-ㆎ가-힣]/
const isHangul = (ch: string | undefined) => !!ch && HAS_HANGUL.test(ch)

function sources(): string[] {
  // Single-syllable entries (particles such as '를', '수') are exact-match only:
  // as substrings they would rewrite unrelated words.
  if (!sortedSources) sortedSources = Object.keys(EN).filter((key) => key.trim().length > 1 && HAS_HANGUL.test(key)).sort((a, b) => b.length - a.length)
  return sortedSources
}

/**
 * Replaces `source` only where it stands as its own word: a Hangul edge of the
 * source must not touch another Hangul syllable. This keeps a short term such
 * as '수' (may) from corrupting '치수', while still translating terms embedded
 * in mixed copy like '반복률 PRF 12 Hz' or 'MES 공정 데이터'.
 */
function replaceWord(text: string, source: string, translation: string): string {
  const checkStart = isHangul(source[0])
  const checkEnd = isHangul(source[source.length - 1])
  let out = ''
  let from = 0
  for (let at = text.indexOf(source); at !== -1; at = text.indexOf(source, at + source.length)) {
    if ((checkStart && isHangul(text[at - 1])) || (checkEnd && isHangul(text[at + source.length]))) continue
    out += text.slice(from, at) + translation
    from = at + source.length
  }
  return from === 0 ? text : out + text.slice(from)
}

/** Translates only known Korean source copy. Original English always passes through unchanged. */
export function localizeSceneText(value: string, locale: Locale): string {
  if (locale !== 'en' || !value) return value
  const exact = EN[value]
  if (exact !== undefined) return exact
  if (!HAS_HANGUL.test(value)) return value
  const cached = memo.get(value)
  if (cached !== undefined) return cached

  // Animated scene copy is frequently assembled from several adjacent text
  // nodes, and HUD labels embed numbers. Try the trimmed string first, then
  // replace known phrases longest-first at word boundaries.
  const trimmed = value.trim()
  let result: string
  if (trimmed !== value && EN[trimmed] !== undefined) {
    result = value.replace(trimmed, EN[trimmed])
  } else {
    result = value
    for (const source of sources()) {
      if (!HAS_HANGUL.test(result)) break
      if (result.includes(source)) result = replaceWord(result, source, EN[source])
    }
  }
  if (memo.size > 5000) memo.clear()
  memo.set(value, result)
  return result
}

function localizeTextNode(node: Text, locale: Locale) {
  const previousRendered = rendered.get(node)
  if (locale === 'ko') {
    const original = originals.get(node)
    // Same guard as attributes: writing an identical value still fires the observer.
    if (original !== undefined && node.data === previousRendered && node.data !== original) node.data = original
    return
  }

  // Imperative scene code may update a node after it has already been
  // translated. Capture that fresh Korean value before translating it again.
  const source = previousRendered === node.data ? originals.get(node) ?? node.data : node.data
  const translated = localizeSceneText(source, locale)
  originals.set(node, source)
  rendered.set(node, translated)
  if (translated !== node.data) node.data = translated
}

const LOCALIZED_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'] as const

function localizeAttributes(root: Element, locale: Locale) {
  const nodes = [root, ...Array.from(root.querySelectorAll('[aria-label], [title], [placeholder], [alt]'))]
  for (const node of nodes) {
    for (const name of LOCALIZED_ATTRIBUTES) {
      const value = node.getAttribute(name)
      if (value === null) continue
      const values = attributes.get(node) ?? new Map<string, string>()
      const original = values.get(name)
      if (locale === 'ko') {
        // Guard value !== original: setAttribute with an unchanged value still queues a
        // mutation record, which would re-trigger the observer forever.
        if (original !== undefined && value !== original && value === localizeSceneText(original, 'en')) node.setAttribute(name, original)
        continue
      }
      const source = original !== undefined && value === localizeSceneText(original, 'en') ? original : value
      values.set(name, source)
      attributes.set(node, values)
      const translated = localizeSceneText(source, locale)
      if (translated !== value) node.setAttribute(name, translated)
    }
  }
}

function localizeTree(root: Element, locale: Locale) {
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text)
  for (const node of nodes) {
    const parent = node.parentElement
    if (parent?.closest('script, style, textarea')) continue
    localizeTextNode(node, locale)
  }
  localizeAttributes(root, locale)
  root.querySelectorAll('iframe').forEach((frame) => localizeFrame(frame))
}

/* ---------- same-origin iframes (e.g. /lab/*.html panels inside a scene) ---------- */

let activeLocale: Locale = 'ko'
// Keyed by prototype, not window: an iframe's WindowProxy survives navigation
// (about:blank → /lab page) while each new document gets a fresh prototype.
const patchedPrototypes = new WeakSet<object>()
const frameObservers = new WeakMap<Document, MutationObserver>()
const watchedFrames = new WeakSet<HTMLIFrameElement>()

function patchCanvas(win: Window & typeof globalThis) {
  const proto = win.CanvasRenderingContext2D?.prototype
  if (!proto || patchedPrototypes.has(proto)) return
  patchedPrototypes.add(proto)
  const fillText = proto.fillText
  const strokeText = proto.strokeText
  proto.fillText = function (text: string, x: number, y: number, maxWidth?: number) {
    return maxWidth === undefined ? fillText.call(this, localizeSceneText(String(text), activeLocale), x, y) : fillText.call(this, localizeSceneText(String(text), activeLocale), x, y, maxWidth)
  }
  proto.strokeText = function (text: string, x: number, y: number, maxWidth?: number) {
    return maxWidth === undefined ? strokeText.call(this, localizeSceneText(String(text), activeLocale), x, y) : strokeText.call(this, localizeSceneText(String(text), activeLocale), x, y, maxWidth)
  }
}

function localizeFrameDocument(frame: HTMLIFrameElement) {
  let doc: Document | null = null
  try {
    doc = frame.contentDocument
  } catch {
    return // cross-origin
  }
  if (!doc?.body || doc.location.href === 'about:blank') return
  // A full app page (e.g. a redirected /s/<slug> route) runs its own
  // LocaleProvider, which follows the 'storage' event — don't double-translate it.
  if (doc.querySelector('script[src*="/_next/"]')) return
  const win = frame.contentWindow as (Window & typeof globalThis) | null
  if (win) patchCanvas(win)
  // Already observed and nothing left to translate (or restore) — skip the walk.
  if (frameObservers.has(doc) && doc.documentElement.lang === activeLocale && (activeLocale === 'ko' || !HAS_HANGUL.test(doc.body.textContent ?? ''))) return
  doc.documentElement.lang = activeLocale
  localizeTree(doc.body, activeLocale)
  if (!frameObservers.has(doc)) {
    const target = doc
    const observer = new MutationObserver(() => localizeTree(target.body, activeLocale))
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...LOCALIZED_ATTRIBUTES] })
    frameObservers.set(doc, observer)
  }
}

function localizeFrame(frame: HTMLIFrameElement) {
  if (!watchedFrames.has(frame)) {
    watchedFrames.add(frame)
    frame.addEventListener('load', () => localizeFrameDocument(frame))
  }
  localizeFrameDocument(frame)
}

/**
 * Applies the scene projection after React and imperative runtimes write to the
 * DOM. `display: contents` preserves every scene's layout contract.
 *
 * Mount this OUTSIDE the scene's Suspense boundary so the observed root is
 * stable while lazy scene chunks resolve and swap. A low-frequency sweep backs
 * up the MutationObserver: it only walks the tree when Korean text is present.
 */
export function SceneLocalizedRoot({ locale, children }: { locale: Locale; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    activeLocale = locale
    localizeTree(root, locale)
    const observer = new MutationObserver(() => localizeTree(root, locale))
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...LOCALIZED_ATTRIBUTES] })
    // Newly registered scene dictionaries (lazy chunks) re-run the projection.
    const onDictionary = () => localizeTree(root, locale)
    dictionaryListeners.add(onDictionary)
    let seenVersion = dictionaryVersion
    const sweep = window.setInterval(() => {
      if (locale !== 'en') return
      if (seenVersion !== dictionaryVersion || HAS_HANGUL.test(root.textContent ?? '')) {
        seenVersion = dictionaryVersion
        localizeTree(root, locale)
      } else {
        root.querySelectorAll('iframe').forEach((frame) => localizeFrame(frame))
      }
    }, 1000)
    return () => {
      observer.disconnect()
      dictionaryListeners.delete(onDictionary)
      window.clearInterval(sweep)
    }
  }, [locale])

  return <div ref={rootRef} style={{ display: 'contents' }}>{children}</div>
}
