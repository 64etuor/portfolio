// Film beats — SSOT for the autoplay portfolio "film" (DX→AX narrative).
//
// The film is a 12-beat persuasive narrative. Each beat plays its self-contained
// scene(s) under /lab/. Each scene gets its OWN duration (ms) so a beat can mix a
// message scene with shorter tech-demo "evidence" cuts. Durations are tuned to
// each scene's internal arc length (its CYCLE/LOOP) so the message payoff — the
// second line + the dynamic climax, which lands in the back half of each loop —
// actually shows before we cut. Beats s9/s10 intercut tech demos as evidence.
// After the ending beat the film returns to the landing (see Film.tsx onFilmEnd).

import { SCENE_CATALOG } from '@/scenes/catalog'

// file = catalog 의 "<key>.html" 만 허용 — 오타/구식 키는 컴파일 실패.
type SceneFile = (typeof SCENE_CATALOG)[number]['file']

interface Shot {
  file: SceneFile // file under /lab/
  ms: number // on-screen duration for this scene
}

export interface Act {
  id: string
  scenes: Shot[]
}

export const ACTS = [
  // 0. 콜드 오픈 — 시스템 부팅 (POST→SYSTEM READY ~3.85s 후 핸드오프; 자체 ms 선언)
  { id: 's0-boot', scenes: [{ file: '05-bios-boot.html', ms: 6200 }] },
  // 1. 시대(SCENE 01) — "시대는 빠르게 변하고 있습니다" 가속하는 시대 스트림 (arc 8.2s; 자체 ms 선언)
  { id: 's1-era', scenes: [{ file: '42-era-shift.html', ms: 8200 }] },
  // 2. 선언(SCENE 02) — 제조업 DX→AX (arc 15s)
  { id: 's1b-ax', scenes: [{ file: '33-ax-era.html', ms: 12000 }] },
  // 2. 현실 — 기대·성과 격차 (arc 13s)
  { id: 's2-reality', scenes: [{ file: '28-gap-reality.html', ms: 11000 }] },
  // 3. 문제 제기 — 소통의 문제 (arc 19s, longest)
  { id: 's3-problem', scenes: [{ file: '29-lost-in-translation.html', ms: 15000 }] },
  // 4+5. 관점 — 현장↔시스템 통합 랙포커스 (CYCLE 22s). 씬4(34)·씬5(35) 통합.
  // persp() DEV 홀드를 f=.5~.9 로 연장(복귀는 .9~1 로 압축)해, 19s(f=.864) 컷 + 720ms
  //   크로스페이드(끝 f=.897)가 전부 DEV 홀드 안에서 끝난다 → 개발자 관점을 충분히(약 8s)
  //   보여주고 현업 복귀는 화면에 안 보인 채 종료. (16.4s 는 너무 빨랐음)
  { id: 's4-perspectives', scenes: [{ file: '41-perspectives.html', ms: 19000 }] },
  // 6. 충돌 — LEXICAL COLLISION (루프 12s). 페이로드 = IMPACT→DRIFT APART
  // ('프로젝트는 멀어집니다', ~10.3s). 그 뒤 RESET(0.86~1.0)은 토큰 재조립=루프 봉합용
  // 이라 컷 전에 끝냄 — 11s는 리셋 되감기가 보여서 살짝 늦게 넘어갔음.
  { id: 's6-collision', scenes: [{ file: '30-collision.html', ms: 10300 }] },
  // 7. 결과 — 비용 균열 전파 (내부 루프 8.77s: idle+charge+rupture+hold+heal).
  // 한 루프(heal 완료=해소)에 맞춰 컷 — 11s는 2번째 루프로 재진입해 늦게 넘어갔음.
  { id: 's7-cost', scenes: [{ file: '31-cost-cascade.html', ms: 8800 }] },
  // 8. 인사이트 — 연결하는 사람 (arc 14s)
  { id: 's8-insight', scenes: [{ file: '32-the-connector.html', ms: 12000 }] },
  // 9. 해결 방향 — 양손잡이 전문가(arc 6.6s, 텍스트 상주) → 제조 이력 증거 몽타주(three.js, 경력 순):
  //    은성(스마트 팩토리 트윈 · 비전 역삽 검출) → 이랜텍(초음파 용착 DOE · LOB 밸런싱) →
  //    솔라엣지(엑셀→DB −451분/일 · S/N 추적 · 글라스울 파우치 MES).
  //    three 씬은 히어로 시퀀스가 ~7s 에 완결 → 7s 컷.
  {
    id: 's9-bridge',
    scenes: [
      { file: '36-bridge-experts.html', ms: 8500 },
      { file: 'x-smart-factory.html', ms: 7000 },
      { file: 'x-vision-reverse.html', ms: 7000 },
      { file: 'x-weld-doe.html', ms: 7000 },
      { file: 'x-lob-balance.html', ms: 7000 },
      { file: 'x-excel-to-db.html', ms: 7000 },
      { file: 'x-sn-trace.html', ms: 7000 },
      { file: 'x-mes-line.html', ms: 7000 },
    ],
  },
  // 10. 핵심 메시지 — 크로스도메인(arc 15s) → AI 시스템 증거(three.js):
  //    Work Radar 두 레일(결정은 사람·자동화는 샌드박스) / KIP 근거 위치(답변→원문 locator).
  {
    id: 's10-crossdomain',
    scenes: [
      { file: '37-cross-domain.html', ms: 12000 },
      { file: 'x-work-radar-rails.html', ms: 7000 },
      { file: 'x-kip-evidence.html', ms: 7000 },
    ],
  },
  // 엔딩 — 캐치프레이즈 (arc 13s) → 랜딩 복귀
  { id: 'ending', scenes: [{ file: '38-ending-catchphrase.html', ms: 12000 }] },
] satisfies Act[]

// Total runtime ≈ 198s (~3:18). Tune individual `ms` values above to taste.
