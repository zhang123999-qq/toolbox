import type { JsEscapeInput, JsEscapeOptions } from './schema'

/** 有专用转义写法的字符（反斜杠必须排在最前，否则会二次转义） */
const CONTROL: Record<string, string> = {
  '\\': '\\\\',
  '\u0000': '\\0',
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\v': '\\v',
  '\f': '\\f',
  '\r': '\\r',
}

/** 反向表：转义用的字母 → 原字符 */
const CONTROL_REVERSE: Record<string, string> = {
  '0': '\u0000',
  b: '\b',
  t: '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  '\\': '\\',
}

/**
 * 转义：只处理会让字符串字面量「断掉」的字符——反斜杠、当前定界引号、
 * 控制字符；普通 ASCII 与非 ASCII（中文、emoji）都保持原样，
 * 免得把一段正常文本变成满屏 `\uXXXX`。
 */
export function escapeJsString(text: string, quote: 'single' | 'double'): string {
  const delimiter = quote === 'double' ? '"' : "'"
  let out = ''
  for (const char of text) {
    const mapped = CONTROL[char]
    if (mapped !== undefined) {
      out += mapped
      continue
    }
    if (char === delimiter) {
      out += '\\' + char
      continue
    }
    const code = char.codePointAt(0) ?? 0
    // 其余控制字符（含 DEL）没有专用写法，统一落到 \uXXXX，保证结果始终单行可粘贴
    if (code < 0x20 || code === 0x7f) {
      out += '\\u' + code.toString(16).toUpperCase().padStart(4, '0')
      continue
    }
    out += char
  }
  return out
}

/**
 * 还原：识别专用转义、`\uXXXX` 与 `\xHH`。
 * 未在表里的 `\z` 这类按 JS 语义取字符本身（`'\z' === 'z'`）；
 * 而 `\u12`、`\x1` 这种「开了头却凑不齐位数」的写法是语法错误，直接报错。
 */
export function unescapeJsString(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] as string
    if (char !== '\\') {
      out += char
      continue
    }

    const next = text[i + 1]
    if (next === undefined) throw new Error('解码失败：输入以孤立的反斜杠结尾')

    const mapped = CONTROL_REVERSE[next]
    if (mapped !== undefined) {
      out += mapped
      i += 1
      continue
    }

    if (next === 'u' || next === 'x') {
      const width = next === 'u' ? 4 : 2
      const hex = text.slice(i + 2, i + 2 + width)
      if (!new RegExp('^[0-9a-fA-F]{' + width + '}$').test(hex)) {
        throw new Error('解码失败：输入含不合法的 \\' + next + ' 转义')
      }
      out += String.fromCharCode(Number.parseInt(hex, 16))
      i += 1 + width
      continue
    }

    // 引号转义与非转义字符：去掉反斜杠取字符本身
    out += next
    i += 1
  }
  return out
}

export function transform(input: JsEscapeInput, options: JsEscapeOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'unescape') return unescapeJsString(input.text)
  return escapeJsString(input.text, options.quote)
}
