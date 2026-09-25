import type { RandomSaltInput, RandomSaltOptions } from './schema'

/** 可选长度（字节）：16 / 32 / 64 */
export const LENGTHS = ['16', '32', '64'] as const

/** 支持的输出编码 */
export const FORMATS = ['hex', 'base64', 'base64url'] as const

/** Base64 字母表 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * 随机源：把传入的字节数组就地填满随机数并返回。
 * 默认实现走 crypto.getRandomValues（CSPRNG）；单测传入确定性实现即可断言格式与长度。
 */
export type SaltRng = (bytes: Uint8Array) => Uint8Array

/** 默认随机源：CSPRNG。注意它是函数，模块加载与渲染期都不会被调用 */
export function secureRandom(bytes: Uint8Array): Uint8Array {
  const source = globalThis.crypto
  if (!source?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法生成随机盐')
  }
  return source.getRandomValues(bytes)
}

/** 解析长度选项；非法取值直接报错，不静默兜底 */
export function parseLength(value: string): number {
  if (!(LENGTHS as readonly string[]).includes(value)) {
    throw new Error('不支持的长度（字节）：' + value)
  }
  return Number(value)
}

/** 字节转十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 字节转 Base64。内置实现，不依赖 btoa，保证任意环境（含单测）结果一致 */
export function toBase64(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  for (; i + 3 <= bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out +=
      B64[b0 >> 2] +
      B64[((b0 & 0x03) << 4) | (b1 >> 4)] +
      B64[((b1 & 0x0f) << 2) | (b2 >> 6)] +
      B64[b2 & 0x3f]
  }
  const rest = bytes.length - i
  if (rest === 1) {
    const b0 = bytes[i]
    out += B64[b0 >> 2] + B64[(b0 & 0x03) << 4] + '=='
  } else if (rest === 2) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    out += B64[b0 >> 2] + B64[((b0 & 0x03) << 4) | (b1 >> 4)] + B64[(b1 & 0x0f) << 2] + '='
  }
  return out
}

/** 按选项把盐字节编码成文本；base64url 用 -_ 替换 +/ 并去掉填充 */
export function encodeSalt(bytes: Uint8Array, format: (typeof FORMATS)[number]): string {
  if (format === 'hex') return toHex(bytes)
  const base64 = toBase64(bytes)
  if (format === 'base64') return base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 生成随机盐。
 *
 * 输入为空串时返回空串，且**不会调用随机源**——这样 SSG 预渲染与首次进入页面
 * 都不会烘焙出随机内容（否则构建不可复现、水合结果不一致）。
 * 输入任意内容（或点「示例」）即视为触发一次生成。
 */
export async function transform(
  input: RandomSaltInput,
  options: RandomSaltOptions,
  rng: SaltRng = secureRandom,
): Promise<string> {
  if (input.text === '') return ''
  const bytes = rng(new Uint8Array(parseLength(options.length)))
  return encodeSalt(bytes, options.format)
}
