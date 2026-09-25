import type { UnicodeEscapeInput, UnicodeEscapeOptions } from './schema'

/** 四位十六进制定长的 \uXXXX 写法 */
const HEX4 = /^[0-9a-fA-F]{4}$/

/** 花括号写法 \u{XXXXX} 里的码点（1~6 位十六进制） */
const HEX_BRACE = /^[0-9a-fA-F]{1,6}$/

/**
 * 转义：ASCII（码点 ≤ 0x7F）保持原样，非 ASCII 才转义。
 * 码点在 BMP 内用 `\uXXXX`；超出 0xFFFF 的（emoji 等）用 ES6 的 `\u{XXXXX}`，
 * 直接用四个十六进制位表示不了这些码点。十六进制统一大写，便于与常见文档对齐。
 */
export function escapeUnicode(text: string): string {
  let out = ''
  // for...of 按码点迭代：代理对会作为一个字符取出，不必手工拼接两个 \uXXXX
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x7f) {
      out += char
      continue
    }
    const hex = code.toString(16).toUpperCase()
    out += code > 0xffff ? '\\u{' + hex + '}' : '\\u' + hex.padStart(4, '0')
  }
  return out
}

/**
 * 还原：同时接受 `\uXXXX` 与 `\u{XXXXX}` 两种写法。
 * 遇到形如 `\u` 但后面不是合法转义的片段时直接报错——静默保留会让用户
 * 以为「还原成功了」，实际拿到的是半截原文。
 */
export function unescapeUnicode(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] as string
    if (char !== '\\' || text[i + 1] !== 'u') {
      out += char
      continue
    }

    if (text[i + 2] === '{') {
      const end = text.indexOf('}', i + 3)
      const body = end === -1 ? '' : text.slice(i + 3, end)
      if (end === -1 || !HEX_BRACE.test(body)) {
        throw new Error('解码失败：输入含不合法的 \\u{...} 转义')
      }
      const code = Number.parseInt(body, 16)
      if (code > 0x10ffff) throw new Error('解码失败：\\u 转义的码点超出 Unicode 范围')
      out += String.fromCodePoint(code)
      i = end
      continue
    }

    const hex = text.slice(i + 2, i + 6)
    if (!HEX4.test(hex)) throw new Error('解码失败：输入含不合法的 \\u 转义')
    out += String.fromCharCode(Number.parseInt(hex, 16))
    i += 5
  }
  return out
}

export function transform(input: UnicodeEscapeInput, options: UnicodeEscapeOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'unescape') return unescapeUnicode(input.text)
  return escapeUnicode(input.text)
}
