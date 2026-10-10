// 씬 전용 디스플레이 폰트 — 씬 내부(scene.module.css / ctx.font)에서만 쓰이는 family 들.
// SceneHost 에서 import 하므로 씬 청크에 실려 "씬을 마운트하는 라우트"에서만 로드된다.
// 랜딩(/)·resume 은 SceneHost 를 마운트하지 않아 이 폰트들을 받지 않는다(임계 경로 축소).
// (Pretendard·JetBrains Mono 같은 전역 폰트는 app/fonts.ts 에 그대로 둔다.)

// Share Tech Mono — terminal/HUD accent (sonar-waterfall, radar-sonar, scada-hmi)
import '@fontsource/share-tech-mono/400.css'

// DM Mono — instrument/label mono (weld-thermal, instrument-rack, pid-scheme)
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'

// 한글은 전부 Pretendard Variable(전역)로 통일 — 씬별 한글 폰트(IBM Plex Sans KR) 제거.

// IBM Plex Mono — secondary mono (sonar-waterfall, radar-sonar)
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'

// Oswald — condensed display (mes-console)
import '@fontsource/oswald/400.css'
import '@fontsource/oswald/600.css'
import '@fontsource/oswald/700.css'
