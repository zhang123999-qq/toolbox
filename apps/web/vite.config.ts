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
          // 应用级共享模块（i18n / 主题 / lib）必须显式命名。
          // 否则 rollup 会把它们塞进「首个被命名的 chunk」，也就是某个工具 chunk：
          // 结果是入口 chunk 反向静态依赖工具 chunk，首屏被迫加载整包工具代码，
          // 且工具页体积预算（30KB）被共享代码污染。870 个工具时后果明显。
          // 排除 node_modules，避免误命中依赖内部的 src/lib 目录。
          if (!id.includes('node_modules') && /\/src\/(i18n|theme|lib)\//.test(id)) {
            return 'app-core'
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
