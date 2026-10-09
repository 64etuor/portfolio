// 씬 폰트 스택 + 캔버스용 폰트 로딩.
//
// 규칙: 라틴 전용 폰트(JetBrains Mono 등) 바로 뒤에 'Pretendard Variable' 을 둔다.
// 그래야 섞여 있는 한글이 OS 폰트(Windows 맑은 고딕 / macOS Apple SD 고딕)가 아니라
// 같은 웹폰트로 렌더되어 두 OS 결과가 같아진다. OS 이름 폰트(SF Mono, Malgun…)는 쓰지 않는다.

export const FONT_SANS = "'Pretendard Variable', sans-serif"
export const FONT_MONO = "'JetBrains Mono', 'Pretendard Variable', monospace"

/** ctx.font 문자열. 예: canvasFont(600, 13, 'mono') → "600 13px 'JetBrains Mono', ..." */
export function canvasFont(weight: number, px: number, family: 'sans' | 'mono' = 'sans'): string {
  return `${weight} ${px}px ${family === 'mono' ? FONT_MONO : FONT_SANS}`
}

const BASE_SAMPLE = '가나다라마바사아자차카타파하 한글 공정 검사 불량 데이터 ABCabc 0123456789 %→·'
const BASE_SPECS = [
  "400 16px 'Pretendard Variable'",
  "700 16px 'Pretendard Variable'",
  "400 16px 'JetBrains Mono'",
  "600 16px 'JetBrains Mono'",
]

let baseReady: Promise<void> | null = null

/**
 * 캔버스/텍스처에 글자를 굽기 전에 호출. document.fonts.ready 는 DOM 이 아직 안 쓴
 * unicode-range 조각(Pretendard 한글 서브셋)을 받아오지 않으므로, 실제 그릴 글자(text)를
 * 넘겨 해당 조각을 명시적으로 로드한다. 최대 timeoutMs 까지만 기다린다(필름 정지 방지).
 */
export function ensureSceneFonts(text = '', timeoutMs = 1500): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  baseReady ??= Promise.all(BASE_SPECS.map((s) => document.fonts.load(s, BASE_SAMPLE))).then(() => undefined, () => undefined)
  const extra = text
    ? Promise.all(BASE_SPECS.map((s) => document.fonts.load(s, text))).then(() => undefined, () => undefined)
    : Promise.resolve()
  const timeout = new Promise<void>((r) => setTimeout(r, timeoutMs))
  return Promise.race([Promise.all([baseReady, extra]).then(() => undefined), timeout])
}
