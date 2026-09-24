import type { EscapeInput, EscapeOptions } from './schema'

const HTML_MAP: ReadonlyArray<[string, string]> = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
]

/** JS 字符串：只处理常见转义，不做完整的 ECMAScript 词法分析 */
const JS_MAP: ReadonlyArray<[string, string]> = [
  ['\\', '\\\\'],
  ["'", "\\'"],
  ['"', '\\"'],
  ['\n', '\\n'],
  ['\r', '\\r'],
  ['\t', '\\t'],
]

/** 反转义的还原表（顺序与转义表相反，先长后短） */
const JS_UNMAP: ReadonlyArray<[string, string]> = [
  ['\\n', '\n'],
  ['\\r', '\r'],
  ['\\t', '\t'],
  ['\\\\', '\\'],
  ["\\'", "'"],
  ['\\"', '"'],
]

export function escapeJs(text: string): string {
  let out = ''
  for (const ch of text) {
    const hit = JS_MAP.find(([from]) => from === ch)
    out += hit ? hit[1] : ch
  }
  return out
}

export function unescapeJs(text: string): string {
  let out = text
  for (const [from, to] of JS_UNMAP) {
    out = out.split(from).join(to)
  }
  return out
}

export function escapeHtml(text: string): string {
  let out = text
  // & 必须先替换，否则会二次转义
  for (const [from, to] of HTML_MAP) {
    if (from === '&') out = out.split('&').join(to)
  }
  for (const [from, to] of HTML_MAP) {
    if (from === '&') continue
    out = out.split(from).join(to)
  }
  return out
}

export function unescapeHtml(text: string): string {
  let out = text
  for (const [from, to] of [...HTML_MAP].reverse()) {
    out = out.split(to).join(from)
  }
  return out
}

/** CSS：转义反斜杠、引号与换行（CSS.escape 需要 DOM，这里用等价的纯函数实现） */
export function escapeCss(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ')
}

export function unescapeCss(text: string): string {
  return text.replace(/\\A /g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

/** SQL：单引号翻倍是最通用的转义方式 */
export function escapeSql(text: string): string {
  return text.split("'").join("''")
}

export function unescapeSql(text: string): string {
  return text.split("''").join("'")
}

export function transform(input: EscapeInput, options: EscapeOptions): string {
  if (input.text === '') return ''
  const escape = options.mode !== 'unescape'
  switch (options.type) {
    case 'js':
      return escape ? escapeJs(input.text) : unescapeJs(input.text)
    case 'css':
      return escape ? escapeCss(input.text) : unescapeCss(input.text)
    case 'json':
      return escape ? JSON.stringify(input.text) : unescapeJson(input.text)
    case 'sql':
      return escape ? escapeSql(input.text) : unescapeSql(input.text)
    case 'html':
    default:
      return escape ? escapeHtml(input.text) : unescapeHtml(input.text)
  }
}

/** JSON 反转义：非法输入时抛出，由 UI 展示 */
export function unescapeJson(text: string): string {
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'string' ? parsed : String(parsed)
  } catch {
    throw new Error('不是合法的 JSON 字符串')
  }
}
