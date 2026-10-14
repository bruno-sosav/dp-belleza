import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Panel de administración — admin.dpbelleza.com.ar
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El monorepo tiene frontend/shared/ fuera del root de esta app.
  server: { fs: { allow: ['../..'] } },
})
