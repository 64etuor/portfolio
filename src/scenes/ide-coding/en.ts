import { registerSceneText } from '../_host/localize'

/**
 * English projection of the legacy /lab/ide-coding.html panel (the React port already
 * ships English source). The only Korean there is one code comment that is typed out
 * character by character, so every typed prefix maps to a proportional English prefix.
 */
const KO_COMMENT = '// 이동 표준편차 기반 실시간 이상치 감지 훅'
const EN_COMMENT = '// Real-time anomaly guard using a rolling standard deviation'
const PREFIX = '// '.length

const entries: Record<string, string> = {}
const koBody = KO_COMMENT.length - PREFIX
const enBody = EN_COMMENT.length - PREFIX
for (let k = PREFIX + 1; k <= KO_COMMENT.length; k++) {
  const partial = KO_COMMENT.slice(0, k)
  if (!/[가-힣]/.test(partial)) continue
  const n = k === KO_COMMENT.length ? EN_COMMENT.length : PREFIX + Math.round(((k - PREFIX) / koBody) * enBody)
  entries[partial] = EN_COMMENT.slice(0, n)
}

registerSceneText(entries)
