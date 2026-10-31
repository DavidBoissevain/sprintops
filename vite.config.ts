import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  'connect-src https://dev.azure.com https://analytics.dev.azure.com',
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

// Build only, because Vite's dev server needs inline scripts and a websocket.
function strictContentSecurityPolicy(): Plugin {
  return {
    name: 'strict-content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), strictContentSecurityPolicy()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
