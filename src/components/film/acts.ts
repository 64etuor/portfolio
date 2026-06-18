// Film beats — SSOT for the autoplay portfolio "film" (DX→AX narrative).
//
// The film is a 12-beat persuasive narrative. Each beat plays its self-contained
// scene(s) under /lab/. Each scene gets its OWN duration (ms) so a beat can mix a
// message scene with shorter tech-demo "evidence" cuts. Durations are tuned to
// each scene's internal arc length (its CYCLE/LOOP) so the message payoff — the
// second line + the dynamic climax, which lands in the back half of each loop —
// actually shows before we cut. Beats s9/s10 intercut tech demos as evidence.
// After the ending beat the film returns to the landing (see Film.tsx onFilmEnd).

export interface Shot {
  file: string // file under /lab/
  ms: number // on-screen duration for this scene
}

export interface Act {
  id: string
  scenes: Shot[]
}

export const ACTS: Act[] = [
  // 1. 시대 변화 — 옛날 OS 부팅 (arc ~6s)
  { id: 's1-era', scenes: [{ file: '05-bios-boot.html', ms: 6500 }] },
  // 1-1. 제조업 — DX→AX (arc 15s)
  { id: 's1b-ax', scenes: [{ file: '33-ax-era.html', ms: 12000 }] },
  // 2. 현실 — 기대·성과 격차 (arc 13s)
  { id: 's2-reality', scenes: [{ file: '28-gap-reality.html', ms: 11000 }] },
  // 3. 문제 제기 — 소통의 문제 (arc 19s, longest)
  { id: 's3-problem', scenes: [{ file: '29-lost-in-translation.html', ms: 15000 }] },
  // 4. 실무자 관점 — RACK FOCUS (arc 16s)
  { id: 's4-field', scenes: [{ file: '34-field-expert.html', ms: 12000 }] },
  // 5. 개발자 관점 — 거울쌍 (arc 9s)
  { id: 's5-dev', scenes: [{ file: '35-dev-expert.html', ms: 8500 }] },
  // 6. 충돌 — 클라이맥스 (arc 12s)
  { id: 's6-collision', scenes: [{ file: '30-collision.html', ms: 11000 }] },
  // 7. 결과 — 비용 균열 전파 (arc ~12s)
  { id: 's7-cost', scenes: [{ file: '31-cost-cascade.html', ms: 11000 }] },
  // 8. 인사이트 — 연결하는 사람 (arc 14s)
  { id: 's8-insight', scenes: [{ file: '32-the-connector.html', ms: 12000 }] },
  // 9. 해결 방향 — 양손잡이 전문가(arc 6.6s, 텍스트 상주) + 증거(CMM / Hermes)
  {
    id: 's9-bridge',
    scenes: [
      { file: '36-bridge-experts.html', ms: 8500 },
      { file: '12-cmm-metrology.html', ms: 6500 },
      { file: '26-graphrag.html', ms: 6500 },
    ],
  },
  // 10. 핵심 메시지 — 크로스도메인(arc 15s) + 증거(MES / 지식맵 / 간트)
  {
    id: 's10-crossdomain',
    scenes: [
      { file: '37-cross-domain.html', ms: 12000 },
      { file: '01-mes-console.html', ms: 6500 },
      { file: '04-ai-latent.html', ms: 6500 },
      { file: '17-gantt-cpm.html', ms: 7500 },
    ],
  },
  // 엔딩 — 캐치프레이즈 (arc 13s) → 랜딩 복귀
  { id: 'ending', scenes: [{ file: '38-ending-catchphrase.html', ms: 12000 }] },
]

// Total runtime ≈ 164.5s (~2:45). Tune individual `ms` values above to taste.
