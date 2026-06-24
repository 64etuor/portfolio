// 순수 함수 어서션. 실행: npx tsx tests/unit/postfx-presets.ts
// (파일명에 test/spec 없음 → Playwright 가 수집하지 않음.)
import assert from 'node:assert/strict'
import { PRESETS, DEFAULT_PRESET, resolvePreset } from '../../src/scenes/_host/postfx/presets'
import type { PostFXPreset } from '../../src/scenes/_host/postfx/types'

const ALL: PostFXPreset[] = ['phosphor', 'instrument', 'clean', 'boot']

// 모든 프리셋이 정의돼 있다.
for (const k of ALL) assert.ok(PRESETS[k], `missing preset: ${k}`)

// 기본 프리셋은 instrument, curvature 0 (DOM 어긋남 방지).
assert.equal(DEFAULT_PRESET, 'instrument')
assert.equal(PRESETS.instrument.curvature, 0)

// resolvePreset: 미지정 → 기본, 지정 → 해당.
assert.deepEqual(resolvePreset(), PRESETS.instrument)
assert.deepEqual(resolvePreset('phosphor'), PRESETS.phosphor)

// tint 는 길이 3.
for (const k of ALL) assert.equal(PRESETS[k].tint.length, 3, `tint len ${k}`)

// 모든 강도는 음수가 아니다.
for (const k of ALL) {
  const u = PRESETS[k]
  for (const [field, v] of Object.entries(u)) {
    if (field === 'tint') continue
    assert.ok((v as number) >= 0, `${k}.${field} < 0`)
  }
}

console.log('postfx-presets: all assertions passed')
