/**
 * Vitest 测试环境全局 setup
 * 解决 pdfjs-dist worker 在 node 环境下找不到文件的问题
 */

import { vi } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 在测试环境中，pdfjs-dist 的 worker 文件路径处理
// vitest 会将 `?url` 导入解析为 /@fs/... 形式，pdfjs 在 node 环境无法直接加载
// 这里 mock pdfjs-dist 的 GlobalWorkerOptions 设置，指向实际文件路径
vi.mock('pdfjs-dist', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  }
})

// 为使用 pdf.worker.min.mjs?url 的工具提供正确的路径
// 在构建时 Vite 会处理，测试时需要手动指向
Object.defineProperty(globalThis, '__PDFJS_WORKER_URL__', {
  value: path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
  writable: false,
  configurable: true,
})
