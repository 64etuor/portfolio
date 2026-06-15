import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 폰트 셀프호스팅 (Fontsource) — CDN 대신 번들에 포함해 오프라인/PDF 결정성 확보.
import '@fontsource/pretendard/400.css'
import '@fontsource/pretendard/500.css'
import '@fontsource/pretendard/600.css'
import '@fontsource/pretendard/700.css'
import '@fontsource-variable/cormorant-garamond/index.css'

import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
