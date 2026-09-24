import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    // 每工具独立 chunk，便于控制工具页 JS < 30KB（DEVELOPMENT.md §11）
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('/src/tools/')) {
            const match = /\/src\/tools\/([^/]+)\//.exec(id)
            if (match?.[1]) return `tool-${match[1]}`
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'node',
    // 文档规定工具单测文件名为 test.ts（DEVELOPMENT.md §8.2）
    include: ['src/**/test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
