import { registerSceneText } from '../_host/localize'

/**
 * English projection of this scene's Korean copy (exact strings first, then word-level terms).
 * Also covers the legacy iframe original at public/lab/gcode-printer.html (same copy).
 */
registerSceneText({
  // Top bar
  '적층제조 치공구 빌드': 'Additive-manufacturing jig build',
  'FDM 파라미터 시뮬레이션': 'FDM parameter simulation',
  노즐: 'Nozzle',
  베드: 'Bed',
  '레이어 높이': 'Layer height',
  인필: 'Infill',
  속도: 'Speed',

  // Build chamber
  'FDM 빌드 챔버 · 적층 제조 시뮬레이션': 'FDM build chamber · additive manufacturing simulation',
  '슬라이싱:': 'Slicing:',
  '레이어 · 인필 35% · 리트랙션 ON': 'layers · infill 35% · retraction ON',
  '남은 시간 계산 중…': 'Calculating time left…',
  // `남은 시간 ≈ ${n}분 · ${done}/${total} moves` — '분' is glued to the number
  '남은 시간 ≈': 'Time left ≈',
  '분 ·': ' min ·',
  '빌드 기록 완료 · 100%': 'Build logged · 100%',

  // G-code stream comments
  '; 노즐 가열 215°C': '; heat nozzle 215°C',
  '; 베드 가열 60°C': '; heat bed 60°C',
  '; 노즐 온도 대기': '; wait for nozzle temp',
  '; 노즐 히터 OFF': '; nozzle heater OFF',
  '; 베드 히터 OFF': '; bed heater OFF',
  '; 스텝모터 정지 · build logged': '; steppers off · build logged',

  // Slicer config blocks
  '슬라이싱 파라미터 · SLICER CONFIG': 'SLICER CONFIG',
  '빌드 진행에 따라 파라미터 블록 순서 고정': 'Parameter blocks lock in order as the build progresses',
  '인필 / 팬 / 재료': 'Infill / fan / material',
  '인필 밀도 35% · Gyroid 패턴 / 솔리드 레이어 상단 4 / 하단 4 · 완전 밀폐 / 팬 속도 60% · 초기 3레이어 OFF / 재료: PETG-CF 1.75mm · 노즐 0.4mm(강화형) / ABS·Nylon 혼용 가능':
    'Infill density 35% · Gyroid pattern / solid layers top 4 / bottom 4 · fully sealed / fan 60% · off for first 3 layers / material: PETG-CF 1.75mm · nozzle 0.4mm (hardened) / ABS·Nylon also usable',
  '인필 35%': 'Infill 35%',
  '팬 60%': 'Fan 60%',
  '속도 / 리트랙션': 'Speed / retraction',
  '출력 속도 60mm/s · 외벽 45mm/s / 이동 속도(travel) 180mm/s · 오징 최소화 / 리트랙션 거리 1.0mm(직결) · 4–5mm(Bowden) / 리트랙션 속도 45mm/s · 코너 감속 활성화':
    'Print speed 60mm/s · outer wall 45mm/s / travel 180mm/s · minimal oozing / retraction 1.0mm (direct) · 4–5mm (Bowden) / retraction speed 45mm/s · corner slowdown on',
  '리트랙션 1.0mm': 'Retraction 1.0mm',
  '코너 감속': 'Corner slowdown',
  '외벽 우선': 'Outer wall first',
  '레이어 / 압출': 'Layer / extrusion',
  '레이어 높이 0.20mm · 초기 레이어 0.30mm(베드 접착 강화) / 벽 두께(perimeters) 3겹 1.2mm · 외벽 우선 출력 / 플로우율(flow) 97% · PETG 오버 압출 보정 / 상단·하단 솔리드 4레이어씩':
    'Layer height 0.20mm · first layer 0.30mm (better bed adhesion) / walls (perimeters) 3 × 1.2mm · outer wall first / flow 97% · PETG over-extrusion compensated / 4 solid layers top and bottom',
  '초기 0.30mm': 'First 0.30mm',
  '3겹 벽': '3 walls',
  '솔리드 4L': 'Solid 4L',
  '온도 설정': 'Temperature',
  '노즐 온도 215°C · PETG-CF 권장 범위 / 베드 온도 60°C · PEI 코팅 베드 최적 / 챔버 온도 35°C · 열수축 방지 / 히팅 대기 M109(노즐) + M190(베드) 동시 예열 / PLA 195–220°C · ABS 240–260°C':
    'Nozzle 215°C · PETG-CF recommended range / bed 60°C · best for PEI-coated bed / chamber 35°C · prevents thermal shrinkage / M109 (nozzle) + M190 (bed) preheat together / PLA 195–220°C · ABS 240–260°C',
  '노즐 215°C': 'Nozzle 215°C',
  '베드 60°C': 'Bed 60°C',

  // QC report
  '프린트 품질 리포트 · QC': 'Print quality report · QC',
  '치수/표면 측정값': 'Dimension / surface measurements',
  '베드 기준면 평탄도': 'Bed datum flatness',
  '카트리지 안착 유격': 'Cartridge seating clearance',
  '인서트 포켓 반복성': 'Insert pocket repeatability',
  '외벽/홀 순서 검증': 'Wall/hole order check',
  '인필 밀도': 'Infill density',
  '체결 보스 보강': 'Screw boss reinforcement',
  '시제품 빌드 시간': 'Prototype build time',
  '42분': '42 min',
  '현장 피드백 반영': 'Field feedback applied',
  '2회': '2 rounds',

  // Process / parameter note
  'PROCESS NOTE · 코너 비드 관찰': 'PROCESS NOTE · corner bead watch',
  '공정 메모:': 'Process note:',
  'layer 042 카트리지 누름면 코너에서 비드 끊김 경향 확인. 코너 감속과 외벽 순서를 조정해 재슬라이싱.':
    'layer 042: beads tend to break at the corners of the cartridge press face. Re-slice with corner slowdown and a new wall order.',
  '▶ APPLY PARAMETER NOTE — 코너 감속 / 외벽 우선': '▶ APPLY PARAMETER NOTE — corner slowdown / outer wall first',
  'PARAMETER NOTE · 재슬라이싱 반영 중': 'PARAMETER NOTE · re-slicing',
  '… 코너 감속 / 외벽 우선 반영 중': '… applying corner slowdown / outer wall first',
  'PARAMETER NOTE · 비드 흐름 안정': 'PARAMETER NOTE · bead flow stable',
  '기록:': 'Log:',
  '코너 감속, 외벽 우선, 리트랙션 거리 조정. 카트리지 누름면 외곽 비드가 끊기지 않도록 출력 조건을 보정.':
    'Corner slowdown, outer wall first, retraction distance tuned. Print settings corrected so the outer bead on the cartridge press face no longer breaks.',

  // Material spools
  '재료 / 공정 스풀 · MATERIAL LIBRARY': 'MATERIAL LIBRARY · material / process spools',
  '로드된 스풀': 'Spools loaded',
  '적층제조 FDM': 'Additive FDM',
  '치공구 설계': 'Jig & fixture design',
  기구설계: 'Mechanical design',
  '카트리지 JIG': 'Cartridge JIG',
  '인서트 JIG': 'Insert JIG',
  '노즐 0.4mm': 'Nozzle 0.4mm',
  '레이어 0.2mm': 'Layer 0.2mm',

  // Complete bar + footer
  '치공구 빌드 완료 · 88 레이어': 'Jig build complete · 88 layers',
  'PETG-CF · 노즐 215°C · 베드 60°C · 인필 35% Gyroid': 'PETG-CF · nozzle 215°C · bed 60°C · infill 35% Gyroid',
  '적층제조 치공구 시안 · 노즐 모션은 G-code 스트림과 동기화됩니다 · FDM 파라미터 실시간 반영':
    'Additive jig concept · nozzle motion is synced to the G-code stream · FDM parameters applied live',

  // Canvas annotations on the jig
  '카트리지 컷팅/누름 JIG': 'Cartridge cut/press JIG',
  'Insert 자동화 포켓': 'Insert automation pocket',
  '체결 보스': 'Screw boss',
  '기준 리브': 'Datum rib',
})
