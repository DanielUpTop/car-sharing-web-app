import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-data-grid',
      '@emotion/react',
      '@emotion/styled'
    ]
  },
  server: {
    watch: {
      usePolling: true
    }
  }
})
