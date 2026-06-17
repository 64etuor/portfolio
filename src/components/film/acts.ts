// Film act data — SSOT for the autoplay portfolio "film".
// Each act plays its scenes (self-contained HTML under /lab/) for durationMs total,
// cycling scenes within the act. Acts are ordered; the final act hands off to the
// interactive gantt finale.

export interface Act {
  id: string
  version: string // v0..v5 / now — shown in VersionHUD
  label: string // era label e.g. '은성 · 2020' ('' for boot)
  color: string // act accent color (datum line + HUD)
  scenes: string[] // file names under /lab/
  durationMs: number // total act duration, split across scenes
  subtitles: string[] // dry log lines, shown sequentially
}

export const ACTS: Act[] = [
  {
    id: 'boot',
    version: 'v0',
    label: '',
    color: '#7a8699',
    scenes: ['05-bios-boot.html'],
    durationMs: 6000,
    subtitles: ['시대는 빠르게 변한다.', '사람도 변해야 한다.'],
  },
  {
    id: 'eunseong',
    version: 'v1',
    label: '은성 · 2020',
    color: '#e0704e',
    scenes: ['20-instrument-rack.html', '08-living-spreadsheet.html'],
    durationMs: 14000,
    subtitles: ['원가를 숫자로 세운다', '엑셀 자동화 = 코딩의 출발'],
  },
  {
    id: 'elentec',
    version: 'v2',
    label: '이랜텍 · 2022',
    color: '#3fa8c0',
    scenes: [
      '02-assembly-line.html',
      '18-sonar-waterfall.html',
      '11-weld-thermal.html',
      '09-oscilloscope.html',
      '16-robot-pendant.html',
      '15-scada-hmi.html',
      '07-gcode-printer.html',
    ],
    durationMs: 20000,
    subtitles: ['병목을 측정 가능한 제약으로', '세 가지로 붙인다', '없으면 Jig를 직접 만든다'],
  },
  {
    id: 'solaredge',
    version: 'v3',
    label: '솔라엣지 · 2023',
    color: '#5588e8',
    scenes: ['01-mes-console.html', '12-cmm-metrology.html', '22-db-architecture.html'],
    durationMs: 18000,
    subtitles: ['예산에서 빠진 칸을 직접 코딩했다', '엑셀이 관계형 DB가 된다'],
  },
  {
    id: 'bridge',
    version: 'v4',
    label: '역량 보강 · 2024',
    color: '#8fa0b4',
    scenes: ['06-digital-twin.html', '04-ai-latent.html'],
    durationMs: 10000,
    subtitles: ['전환이 아니라 장착', '도메인을 연결하면 안 보이던 문제가 보인다'],
  },
  {
    id: 'startup',
    version: 'v5',
    label: '스타트업 · 2025',
    color: '#9470e0',
    scenes: [
      '19-pid-scheme.html',
      '03-pipeline-dag.html',
      '23-agent-governance.html',
      '25-decision-os.html',
      '26-graphrag.html',
    ],
    durationMs: 20000,
    subtitles: ['이번엔 전부 직접 짓는다', '관제실의 시선'],
  },
  {
    id: 'epilogue',
    version: 'now',
    label: 'Work Radar',
    color: '#46c79a',
    scenes: ['13-radar-sonar.html'],
    durationMs: 8000,
    subtitles: ['다음 버전은 아직 빌드 중'],
  },
]
