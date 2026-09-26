import type { Blake3Input, Blake3Options } from './schema'

/** 可选输出长度（字节） */
export const LENGTHS = ['32', '64'] as const

/** 字节 → 十六进制 */
export function toHex(bytes: Uint8Array, uppercase: boolean): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return uppercase ? out.toUpperCase() : out
}

/** 长度校验 */
export function parseLength(value: string): number {
  if (!(LENGTHS as readonly string[]).includes(value)) {
    throw new Error('不支持的输出长度：' + value + '（可选 32 / 64 字节）')
  }
  return Number(value)
}

/**
 * 浏览器 / Node 两套 BLAKE3 加载。
 *
 * 关键坑：包的 package.json 同时给了 `module`（Node 入口）和 `browser`（浏览器入口）。
 * Vite/rolldown 在浏览器构建里会按 `browser` 字段把 `import 'blake3-wasm'` 重定向到
 * `esm/browser`，但那个入口只 re-export `hash`，**不会注入 WASM**（注入发生在包根
 * `browser.js` 里），直接调用会抛 “BLAKE3 webassembly not loaded”。
 *
 * 浏览器必须走官方异步入口 `blake3-wasm/browser-async`，并把 WASM 字节以 Vite 的
 * `?url` 资源地址交给它 fetch + WebAssembly.instantiateStreaming 初始化。
 * Node（vitest 真跑官方向量）下走默认 Node 入口。注意 vitest 的 jsdom 组件测试
 * （Tool.test.tsx）虽然提供 DOM，但 `?url` 资源在 jsdom 里无法被 fetch 实例化，
 * 会挂起超时；因此凡是 vitest（import.meta.env.VITEST）一律走 Node 入口——
 * 这也保持了改造前组件测试跑真实哈希的行为。
 */
async function loadBlake3(): Promise<{
  hash: (input: Uint8Array, options?: { length?: number }) => ArrayLike<number>
}> {
  if (import.meta.env?.SSR || import.meta.env?.VITEST) {
    return (await import('blake3-wasm')) as unknown as {
      hash: (input: Uint8Array, options?: { length?: number }) => ArrayLike<number>
    }
  }
  const [loader, wasmModule] = await Promise.all([
    import('blake3-wasm/browser-async'),
    import('blake3-wasm/dist/wasm/web/blake3_js_bg.wasm?url'),
  ])
  return loader.default((wasmModule as unknown as { default: string }).default)
}

/**
 * BLAKE3 摘要。
 * WASM 体积不小，故**按需动态 import**：只有真正点了运行才会去加载模块。
 */
export async function hashBlake3(text: string, options: Blake3Options): Promise<string> {
  const length = parseLength(options.length)
  const blake3 = await loadBlake3()
  // 显式按 UTF-8 编码成字节再哈希，避免直接传 string 时 JS 字符串（含中文）
  // 按 UTF-16 计字节造成的摘要歧义。
  const bytes = new TextEncoder().encode(text)
  const digest = blake3.hash(bytes, { length })
  return toHex(new Uint8Array(digest), options.uppercase)
}

export async function transform(input: Blake3Input, options: Blake3Options): Promise<string> {
  if (input.text === '') return ''
  return hashBlake3(input.text, options)
}
