import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [react(), tailwindcss(), wasm()],
  build: {
    target: 'es2022',
    // 单 chunk 软上限：超限即提示排查，避免大包静默进首屏
    chunkSizeWarningLimit: 1024,
    // 每工具独立 chunk，便于控制工具页 JS < 30KB（DEVELOPMENT.md §11）
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Vendor 分包：React 运行时统一打进 vendor-react（首屏必需、长期稳定）
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react'
          }
          // 大体积按需依赖独立成 chunk：仅访问对应工具时加载，不污染首屏
          if (id.includes('node_modules/echarts/')) return 'vendor-echarts'
          if (id.includes('node_modules/pdfjs-dist/')) return 'vendor-pdfjs'
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
    // 确保 pdfjs-dist 的 worker 文件被复制到 dist
    assetsDir: 'assets',
    copyPublicDir: true,
  },
  // 确保 @neslinesli93/qpdf-wasm 的 WASM 文件在测试环境中可用
  optimizeDeps: {
    exclude: ['@neslinesli93/qpdf-wasm'],
  },
  test: {
    environment: 'node',
    // 文档规定工具单测文件名为 test.ts（DEVELOPMENT.md §8.2）
    include: ['src/**/test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Windows 下 fork 一个子进程约 420ms，152 个测试文件光启动就要几十秒；
    // 线程池共享进程、jsdom 环境按文件复用，墙钟时间明显更短。
    // （只有渲染组件的用例需要 DOM，靠文件顶部 `// @vitest-environment jsdom`
    // 声明；vitest 3 已废弃 environmentMatchGlobs，不要再用它。）
    pool: 'threads',
    // 用例之间有共享的可变状态（localStorage / document.title），
    // 每次跑完清一遍，避免新增用例互相污染
    restoreMocks: true,
    // 确保 pdfjs-dist worker 在测试环境可用
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      // 阈值取保守基线（实测基线未量化前先防「零断言裸奔」），量化后可再上调
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
})
