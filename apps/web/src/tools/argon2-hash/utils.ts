import type { Argon2Input, Argon2Options } from './schema'

/** 参数取值白名单（与 schema / Tool.tsx 保持一致） */
export const ITERATIONS = ['1', '2', '3'] as const
export const MEMORIES = ['8192', '19456', '32768'] as const
export const PARALLELISMS = ['1', '2'] as const

/** 输出哈希长度（字节） */
export const HASH_LENGTH = 32

/** PHC 串的形状：$argon2id$v=19$m=…,t=…,p=…$<salt>$<hash> */
export const PHC_PATTERN =
  /^\$argon2(?:i|d|id)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/

/** 传给 argon2-browser 的参数（纯函数，便于单测） */
export interface Argon2Params {
  pass: string
  salt: string
  time: number
  mem: number
  parallelism: number
  hashLen: number
  type: number
}

function parseNumber(value: string, allowed: readonly string[], label: string): number {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`不支持的${label}：${value}（可选 ${allowed.join(' / ')}）`)
  }
  return Number(value)
}

/** 随机盐：16 字节 → Base64（22 字符） */
export function randomSalt(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

/** 选项 → Argon2 参数；type 固定为 Argon2id（2），是当前推荐变体 */
export function buildParams(
  password: string,
  salt: string,
  options: Argon2Options,
  argon2idType = 2,
): Argon2Params {
  return {
    pass: password,
    salt,
    time: parseNumber(options.iterations, ITERATIONS, '迭代次数'),
    mem: parseNumber(options.memory, MEMORIES, '内存开销'),
    parallelism: parseNumber(options.parallelism, PARALLELISMS, '并行度'),
    hashLen: HASH_LENGTH,
    type: argon2idType,
  }
}

/**
 * 生成 Argon2id 哈希。
 * WASM 体积不小，故**按需动态 import**：只有真正点了运行才会去下载 argon2 模块。
 *
 * 这里显式走自包含产物 dist/argon2-bundled.min.js（wasm 以 base64 内联）：
 * 包的 CJS 主入口在 Node 分支静态 require('../dist/argon2.wasm')，rolldown 生产构建
 * 会因该 .wasm 含顶层 await 报 REQUIRE_TLA；bundled 产物没有这条 require，可正常打包。
 */
export async function hashPassword(password: string, options: Argon2Options): Promise<string> {
  const argon2 = (await import('argon2-browser/dist/argon2-bundled.min.js')).default
  const result = await argon2.hash({
    ...buildParams(password, randomSalt(), options, argon2.ArgonType?.Argon2id ?? 2),
  })
  const encoded = result.encoded
  if (typeof encoded !== 'string' || encoded === '') {
    throw new Error('Argon2 未返回 PHC 哈希串')
  }
  return encoded
}

/** 校验口令：不匹配给出结论，哈希串不合法才算输入错误 */
export async function verifyPassword(password: string, hashValue: string): Promise<string> {
  if (hashValue.trim() === '') throw new Error('请先粘贴待校验的 Argon2 哈希')
  if (!PHC_PATTERN.test(hashValue.trim())) {
    throw new Error('不是合法的 Argon2 PHC 串：应形如 $argon2id$v=19$m=19456,t=2,p=1$…')
  }
  const argon2 = (await import('argon2-browser/dist/argon2-bundled.min.js')).default
  try {
    await argon2.verify({ pass: password, encoded: hashValue.trim() })
    return '校验通过：口令与哈希匹配'
  } catch {
    return '校验失败：口令与哈希不匹配'
  }
}

export async function transform(input: Argon2Input, options: Argon2Options): Promise<string> {
  if (input.text === '') return ''
  if (options.direction === 'verify') return verifyPassword(input.text, input.hash)
  return hashPassword(input.text, options)
}
