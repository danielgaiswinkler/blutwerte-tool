import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visionApiPlugin } from './vite-plugin-vision'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), visionApiPlugin()],
  base: '/blutwerte-tool/',
})
