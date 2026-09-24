import type { UnicodeLookupInput } from './schema'

export interface CharInfo {
  ch: string
  codePoint: number
  hex: string
  utf8: string
  utf16: string
  category: string
  block: string
  jsEscape: string
  htmlEntity: string
}

/** 常用 Unicode 区段：够定位字符来源，不做逐字符命名（那需要上 MB 的表） */
const BLOCKS: ReadonlyArray<{ start: number; end: number; name: string }> = [
  { start: 0x0000, end: 0x007f, name: '基本拉丁字母' },
  { start: 0x0080, end: 0x00ff, name: '拉丁字母补充-1' },
  { start: 0x0100, end: 0x017f, name: '拉丁字母扩展-A' },
  { start: 0x0180, end: 0x024f, name: '拉丁字母扩展-B' },
  { start: 0x0370, end: 0x03ff, name: '希腊字母' },
  { start: 0x0400, end: 0x04ff, name: '西里尔字母' },
  { start: 0x0600, end: 0x06ff, name: '阿拉伯文' },
  { start: 0x2000, end: 0x206f, name: '常用标点' },
  { start: 0x20a0, end: 0x20cf, name: '货币符号' },
  { start: 0x2100, end: 0x214f, name: '类字母符号' },
  { start: 0x2190, end: 0x21ff, name: '箭头' },
  { start: 0x2200, end: 0x22ff, name: '数学运算符' },
  { start: 0x2300, end: 0x23ff, name: '杂项技术符号' },
  { start: 0x2460, end: 0x24ff, name: '带圈字母数字' },
  { start: 0x2500, end: 0x257f, name: '制表符' },
  { start: 0x25a0, end: 0x25ff, name: '几何图形' },
  { start: 0x2600, end: 0x26ff, name: '杂项符号' },
  { start: 0x2700, end: 0x27bf, name: '装饰符号' },
  { start: 0x3000, end: 0x303f, name: 'CJK 符号与标点' },
  { start: 0x3040, end: 0x309f, name: '日文平假名' },
  { start: 0x30a0, end: 0x30ff, name: '日文片假名' },
  { start: 0x3400, end: 0x4dbf, name: 'CJK 扩展 A' },
  { start: 0x4e00, end: 0x9fff, name: 'CJK 基本汉字' },
  { start: 0xac00, end: 0xd7af, name: '韩文音节' },
  { start: 0xf900, end: 0xfaff, name: 'CJK 兼容汉字' },
  { start: 0xff00, end: 0xffef, name: '半角与全角形式' },
  { start: 0x1f300, end: 0x1f5ff, name: '杂项符号与图形' },
  { start: 0x1f600, end: 0x1f64f, name: '表情符号' },
  { start: 0x1f900, end: 0x1f9ff, name: '补充符号与图形' },
]

/** 按码位查所属区段 */
export function blockOf(codePoint: number): string {
  for (const block of BLOCKS) {
    if (codePoint >= block.start && codePoint <= block.end) return block.name
  }
  return '未收录区段'
}

/** 粗分类：够用的语义标签，不是 Unicode 官方 General_Category */
export function categoryOf(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0
  if (cp >= 0x1f300) return 'emoji'
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(ch)) return '汉字'
  if (/[\u3040-\u30ff]/.test(ch)) return '日文假名'
  if (/[\uac00-\ud7af]/.test(ch)) return '韩文音节'
  if (/[0-9]/.test(ch)) return '数字'
  if (/[A-Za-z]/.test(ch)) return '拉丁字母'
  if (/\s/.test(ch)) return '空白'
  if (/[-.,!?;:'"()]/.test(ch)) return '标点'
  return '符号'
}

/** UTF-8 字节的十六进制表示 */
export function utf8Hex(ch: string): string {
  return [...new TextEncoder().encode(ch)]
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

/** 取名 describeChar 而非 describe：避免与 vitest 的 describe 重名导致测试文件报错 */
export function describeChar(ch: string): CharInfo {
  const codePoint = ch.codePointAt(0) ?? 0
  const hex = 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0')
  const utf16 = [...ch]
    .map((unit) => unit.charCodeAt(0))
    .map((unit) => unit.toString(16).toUpperCase().padStart(4, '0'))
    .join(' ')
  return {
    ch,
    codePoint,
    hex,
    utf8: utf8Hex(ch),
    utf16,
    category: categoryOf(ch),
    block: blockOf(codePoint),
    jsEscape:
      codePoint > 0xffff
        ? '\\u{' + codePoint.toString(16) + '}'
        : '\\u' + codePoint.toString(16).toUpperCase().padStart(4, '0'),
    htmlEntity: '&#x' + codePoint.toString(16).toUpperCase() + ';',
  }
}

export function transform(input: UnicodeLookupInput): string {
  const chars = [...input.text]
  if (chars.length === 0) return ''
  return chars
    .map((ch) => {
      const info = describeChar(ch)
      return [
        '字符：' + info.ch,
        '码位：' + info.hex + '（' + info.codePoint + '）',
        'UTF-8：' + info.utf8,
        'UTF-16：' + info.utf16,
        '分类：' + info.category,
        '区段：' + info.block,
        '转义：' + info.jsEscape + '　HTML：' + info.htmlEntity,
      ].join('\n')
    })
    .join('\n\n')
}
