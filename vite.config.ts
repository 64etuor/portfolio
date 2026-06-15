import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

// Tailwind v4 는 postcss.config.mjs 의 @tailwindcss/postcss 로 처리한다.
// (Vite 8/rolldown 환경에서 @tailwindcss/vite 플러그인보다 안정적)
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
