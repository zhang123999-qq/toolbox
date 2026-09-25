import type { OctalInput, OctalOptions } from './schema'

/** 字节分块大小：避免 String.fromCharCode(...values) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 八进制字面量：一个或多个 0–7 */
const OCTAL_TOKEN = /^[0-7]+$/

/** UTF-16 码元上限（char 模式的一个值不能超过它） */
const MAX_CODE_UNIT = 0xffff

/** 单字节上限（byte 模式的一个值不能超过它），八进制写作 377 */
const MAX_BYTE = 0xff

/** 码元数组 → 字符串，分块调用避免超长数组撑爆调用栈 */
function codeUnitsToText(values: readonly number[]): string {
  let out = ''
  for (let i = 0; i < values.length; i += CHUNK) {
    out += String.fromCharCode(...values.slice(i, i + CHUNK))
  }
  return out
}

/**
 * 文本 → 八进制：每个值至少 3 位（不足补 0），值之间用空格分隔。
 * byte 模式取 UTF-8 字节，char 模式取 UTF-16 码元。
 */
export function encodeOctal(text: string, mode: string): string {
  const values: number[] =
    mode === 'byte'
      ? Array.from(new TextEncoder().encode(text))
      : Array.from({ length: text.length }, (_, i) => text.charCodeAt(i))
  return values.map((value) => value.toString(8).padStart(3, '0')).join(' ')
}

/**
 * 八进制 → 文本：按空白切分取值，逐个转回。
 * byte 模式把值当字节，整体按 UTF-8 还原（因此能正确处理中文/emoji）；
 * char 模式把值当 UTF-16 码元，用 fromCharCode 拼回（代理对会被自动接上）。
 */
export function decodeOctal(text: string, mode: string): string {
  const tokens = text
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '')
  if (tokens.length === 0) return ''

  const values: number[] = []
  tokens.forEach((token, index) => {
    if (!OCTAL_TOKEN.test(token)) {
      throw new Error(`第 ${index + 1} 个值“${token}”含非八进制字符`)
    }
    const value = Number.parseInt(token, 8)
    const limit = mode === 'byte' ? MAX_BYTE : MAX_CODE_UNIT
    if (value > limit) {
      throw new Error(
        mode === 'byte'
          ? `第 ${index + 1} 个值“${token}”超出单字节范围（最大 377）`
          : `第 ${index + 1} 个值“${token}”超出 UTF-16 码元范围（最大 177777）`,
      )
    }
    values.push(value)
  })

  if (mode === 'byte') {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(values))
    } catch {
      throw new Error('解码失败：这些字节不是合法的 UTF-8 文本')
    }
  }
  return codeUnitsToText(values)
}

export function transform(input: OctalInput, options: OctalOptions): string {
  if (input.text === '') return ''
  return options.direction === 'encode'
    ? encodeOctal(input.text, options.mode)
    : decodeOctal(input.text, options.mode)
}
