import type { HtmlEntityInput, HtmlEntityOptions } from './schema'

/**
 * 常用命名实体表（HTML5 规范里的常见子集）。
 * 编码时优先用命名实体，表里没有的字符回落到数字实体——这样输出既可读又完整。
 */
const NAMED: Record<string, string> = {
  '&': 'amp',
  '<': 'lt',
  '>': 'gt',
  '"': 'quot',
  "'": 'apos',
  '\u00a0': 'nbsp',
  '\u00a1': 'iexcl',
  '\u00a9': 'copy',
  '\u00ae': 'reg',
  '\u00b0': 'deg',
  '\u00b1': 'plusmn',
  '\u00b6': 'para',
  '\u00b7': 'middot',
  '\u00bb': 'raquo',
  '\u00ab': 'laquo',
  '\u00bd': 'frac12',
  '\u00bc': 'frac14',
  '\u00be': 'frac34',
  '\u00d7': 'times',
  '\u00f7': 'divide',
  '\u00a3': 'pound',
  '\u00a5': 'yen',
  '\u00a2': 'cent',
  '\u20ac': 'euro',
  '\u00a7': 'sect',
  '\u00b5': 'micro',
  '\u2020': 'dagger',
  '\u2021': 'Dagger',
  '\u2022': 'bull',
  '\u2026': 'hellip',
  '\u2013': 'ndash',
  '\u2014': 'mdash',
  '\u2018': 'lsquo',
  '\u2019': 'rsquo',
  '\u201c': 'ldquo',
  '\u201d': 'rdquo',
  '\u2122': 'trade',
  '\u2190': 'larr',
  '\u2192': 'rarr',
  '\u2191': 'uarr',
  '\u2193': 'darr',
  '\u21d2': 'rArr',
  '\u2260': 'ne',
  '\u2264': 'le',
  '\u2265': 'ge',
  '\u221e': 'infin',
  '\u221a': 'radic',
  '\u2248': 'asymp',
  '\u03b1': 'alpha',
  '\u03b2': 'beta',
  '\u03b3': 'gamma',
  '\u03b4': 'delta',
  '\u03b8': 'theta',
  '\u03bb': 'lambda',
  '\u03bc': 'mu',
  '\u03c0': 'pi',
  '\u03c3': 'sigma',
  '\u03c6': 'phi',
  '\u03c9': 'omega',
  '\u0394': 'Delta',
  '\u03a3': 'Sigma',
  '\u03a9': 'Omega',
  '\u2713': 'check',
  '\u2717': 'cross',
  '\u2605': 'starf',
  '\u2606': 'star',
}

/** 反向表：实体名 → 字符，供解码使用 */
const BY_NAME = new Map(Object.entries(NAMED).map(([char, name]) => [name, char]))

/** HTML 里必须转义的五个字符（其余按需） */
const MUST_ESCAPE = new Set(['&', '<', '>', '"', "'"])

/**
 * 编码。`named` 模式对表里有的字符用命名实体、其余用十进制数字实体；
 * `numeric` 模式一律用十进制数字实体。ASCII 可打印字符里只有必须转义的才动，
 * 免得把普通文本也编码成一堆 &#xx; 反而不可读。
 */
export function encodeHtmlEntity(text: string, mode: string): string {
  let out = ''
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    const isSpecial = MUST_ESCAPE.has(char)
    if (!isSpecial && code >= 0x20 && code <= 0x7e) {
      out += char
      continue
    }
    const name = NAMED[char]
    if (mode === 'named' && name) {
      out += '&' + name + ';'
      continue
    }
    if (mode === 'named' && isSpecial) {
      out += '&' + NAMED[char] + ';'
      continue
    }
    out += '&#' + String(code) + ';'
  }
  return out
}

/**
 * 解码：同时支持命名实体、十进制（`&#38;`）与十六进制（`&#x26;` / `&#X26;`）数字实体。
 * 十六进制前缀大小写都接受——规范只写小写 `x`，但真实网页里大小写混用很常见。
 * 未识别的实体原样保留（很多模板里会写着 `&foo;` 这类自有占位符，不该被吃掉）。
 */
export function decodeHtmlEntity(text: string): string {
  return text.replace(
    /&(#(?:[xX][0-9a-fA-F]+|[0-9]+)|[a-zA-Z][a-zA-Z0-9]*);/g,
    (whole, body: string) => {
      if (body.startsWith('#')) {
        const isHex = /^#[xX]/.test(body)
        const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole
      }
      return BY_NAME.get(body) ?? whole
    },
  )
}

export function transform(input: HtmlEntityInput, options: HtmlEntityOptions): string {
  if (input.text === '') return ''
  try {
    if (options.direction === 'decode') return decodeHtmlEntity(input.text)
    return encodeHtmlEntity(input.text, options.mode)
  } catch {
    throw new Error('解码失败：输入含超出 Unicode 范围的实体引用')
  }
}
