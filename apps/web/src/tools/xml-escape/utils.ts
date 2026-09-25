import type { XmlEscapeInput, XmlEscapeOptions } from './schema'

/**
 * XML 规范只预定义了这五个实体——没有 `&nbsp;` 这类 HTML 命名实体。
 * 别的字符一律是普通字符，XML 本身按 Unicode 存文本，不需要转义。
 */
const NAMED: Record<string, string> = {
  '&': 'amp',
  '<': 'lt',
  '>': 'gt',
  '"': 'quot',
  "'": 'apos',
}

/** 同一个字符对应的十进制码点（数字实体用） */
const CODE: Record<string, number> = {
  '&': 38,
  '<': 60,
  '>': 62,
  '"': 34,
  "'": 39,
}

/** 反向表：实体名 → 字符 */
const BY_NAME: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

/** 实体引用：五个命名实体 + 十进制 / 十六进制数字实体 */
const ENTITY = /&(amp|lt|gt|quot|apos|#\d+|#[xX][0-9a-fA-F]+);/g

/** CDATA 段（含被 `]]>` 拆开后重新拼出的那种） */
const CDATA = /<!\[CDATA\[([\s\S]*?)\]\]>/g

/** 文本 → CDATA 段。文本里出现 `]]>` 时必须断开，否则会提前把这一段关掉 */
function toCdata(text: string): string {
  return '<![CDATA[' + text.split(']]>').join(']]]]><![CDATA[>') + ']]>'
}

/**
 * 转义。`entity` 用五个命名实体（如 `&lt;`），`numeric` 用十进制数字实体
 * （如 `&#60;`）——两者都只动这五个字符，其余（含中文）保持原样；
 * `cdata` 不逐字符转义，而是整段包进 CDATA。
 */
export function escapeXml(text: string, mode: string): string {
  if (mode === 'cdata') return toCdata(text)

  let out = ''
  for (const char of text) {
    const code = CODE[char]
    if (code === undefined) {
      out += char
      continue
    }
    out += mode === 'numeric' ? '&#' + code + ';' : '&' + NAMED[char] + ';'
  }
  return out
}

/**
 * 还原：先拼回 CDATA 段，再还原命名实体与数字实体。
 * 未在规范内的实体（如 HTML 的 `&nbsp;`）**原样保留**，避免吃掉模板自有的占位符。
 */
export function unescapeXml(text: string): string {
  return text.replace(CDATA, '$1').replace(ENTITY, (whole, body: string) => {
    if (!body.startsWith('#')) return BY_NAME[body] ?? whole
    const isHex = /^#[xX]/.test(body)
    const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10)
    if (!Number.isFinite(code) || code > 0x10ffff) {
      throw new Error('解码失败：实体引用的码点超出 Unicode 范围')
    }
    return String.fromCodePoint(code)
  })
}

export function transform(input: XmlEscapeInput, options: XmlEscapeOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'unescape') return unescapeXml(input.text)
  return escapeXml(input.text, options.mode)
}
