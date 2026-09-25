import type { CssEscapeInput, CssEscapeOptions } from './schema'

/** 标识符里可以直接写、无需转义的字符 */
const SAFE = /^[A-Za-z0-9_-]$/

/**
 * 转义：安全字符原样保留，其余一律写成 `\` + 十六进制码点 + 一个空格。
 * 尾随空格是规范里的「消歧分隔符」——`\4e2d` 后面若紧跟十六进制字符（如 `a`），
 * 会被拼成更长的码点，加空格才能明确转义到这里结束。非 ASCII 也照此转义，
 * 输出因此一定能安全放进只认 ASCII 的 CSS 文件或选择器里。
 */
export function escapeCss(text: string): string {
  let out = ''
  for (const char of text) {
    if (SAFE.test(char)) {
      out += char
      continue
    }
    const code = char.codePointAt(0) ?? 0
    // 规范规定 NUL 不能出现在样式表里，统一换成替换字符
    if (code === 0) {
      out += '\uFFFD'
      continue
    }
    out += '\\' + code.toString(16) + ' '
  }
  return out
}

/**
 * 还原：完整实现 CSS 语法里的「转义」产生式——
 * `\` + 1~6 位十六进制 + 一个可选空白；`\` + 其它字符则直接取该字符（如 `\.` → `.`）；
 * 反斜杠后紧跟换行是**续行**，反斜杠与换行都不产生字符。
 * 码点为 0 或超出 Unicode 范围时按规范回落为替换字符 U+FFFD。
 */
export function unescapeCss(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] as string
    if (char !== '\\') {
      out += char
      continue
    }

    const next = text[i + 1]
    if (next === undefined) throw new Error('解码失败：输入以孤立的反斜杠结尾')

    if (next === '\n') {
      i += 1
      continue
    }
    if (next === '\r') {
      i += text[i + 2] === '\n' ? 2 : 1
      continue
    }
    if (!/[0-9a-fA-F]/.test(next)) {
      out += next
      i += 1
      continue
    }

    let j = i + 1
    let hex = ''
    while (j < text.length && hex.length < 6 && /[0-9a-fA-F]/.test(text[j] as string)) {
      hex += text[j]
      j += 1
    }
    // 紧跟的空白字符只用于消歧，本身不进结果
    if (j < text.length && /\s/.test(text[j] as string)) {
      if (text[j] === '\r' && text[j + 1] === '\n') j += 1
      j += 1
    }

    const code = Number.parseInt(hex, 16)
    out += code === 0 || code > 0x10ffff ? '\uFFFD' : String.fromCodePoint(code)
    i = j - 1
  }
  return out
}

export function transform(input: CssEscapeInput, options: CssEscapeOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'unescape') return unescapeCss(input.text)
  return escapeCss(input.text)
}
