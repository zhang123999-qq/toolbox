import type { CharsetLookupInput } from './schema'

/** 一个字符集的判定：给出码点区间与一句话说明 */
interface Charset {
  readonly name: string
  readonly note: string
  readonly inRange: (code: number) => boolean
}

/** 判断码点是否落在任意一段区间内 */
function between(code: number, ranges: readonly (readonly [number, number])[]): boolean {
  return ranges.some(([from, to]) => code >= from && code <= to)
}

/**
 * 常见字符集的码点覆盖。
 * 说明：这些传统编码在 Unicode 里的映射并不连续，这里按「是否落在该字符集
 * 主要收录的 Unicode 区块」粗判，不是全表比对。GB 系列与 Big5 都收汉字，
 * 在 Unicode 上完全重叠，因此**无法据此区分**简体还是繁体编码。
 */
const CHARSETS: readonly Charset[] = [
  { name: 'ASCII', note: '7 位基础拉丁，所有编码都兼容', inRange: (c) => c < 0x80 },
  {
    name: 'ISO-8859-1（Latin-1）',
    note: '西欧拉丁字母，UTF-8 里占 2 字节',
    inRange: (c) => c < 0x100,
  },
  {
    name: 'GB2312 / GBK / GB18030',
    note: '简体汉字编码；命中只说明「是汉字」，具体字是否被 GB2312 收录需查表',
    inRange: (c) =>
      between(c, [
        [0x3400, 0x4dbf],
        [0x4e00, 0x9fff],
      ]),
  },
  {
    name: 'Big5',
    note: '繁体汉字编码；与 GB 系列在 Unicode 上重叠，无法据此区分',
    inRange: (c) =>
      between(c, [
        [0x3400, 0x4dbf],
        [0x4e00, 0x9fff],
      ]),
  },
  {
    name: 'Shift_JIS',
    note: '日文：假名与日文专用符号、全角字符',
    inRange: (c) =>
      between(c, [
        [0x3000, 0x303f],
        [0x3040, 0x30ff],
        [0xff00, 0xffef],
      ]),
  },
  {
    name: 'EUC-KR',
    note: '韩文：谚文音节与谚文字母',
    inRange: (c) =>
      between(c, [
        [0x1100, 0x11ff],
        [0x3130, 0x318f],
        [0xac00, 0xd7a3],
      ]),
  },
  {
    name: 'Windows-1251 / KOI8-R',
    note: '西里尔字母',
    inRange: (c) => between(c, [[0x0400, 0x04ff]]),
  },
  {
    name: 'ISO-8859-7',
    note: '希腊字母',
    inRange: (c) => between(c, [[0x0370, 0x03ff]]),
  },
]

/** Unicode 区块：只列常见的一段，够用来回答「这字符属于哪类」 */
const BLOCKS: readonly (readonly [number, number, string])[] = [
  [0x0000, 0x007f, 'Basic Latin（基本拉丁）'],
  [0x0080, 0x00ff, 'Latin-1 Supplement（拉丁补充）'],
  [0x0100, 0x017f, 'Latin Extended-A'],
  [0x0180, 0x024f, 'Latin Extended-B'],
  [0x0370, 0x03ff, 'Greek and Coptic（希腊字母）'],
  [0x0400, 0x04ff, 'Cyrillic（西里尔字母）'],
  [0x0590, 0x05ff, 'Hebrew（希伯来文）'],
  [0x0600, 0x06ff, 'Arabic（阿拉伯文）'],
  [0x0e00, 0x0e7f, 'Thai（泰文）'],
  [0x2000, 0x206f, 'General Punctuation（通用标点）'],
  [0x20a0, 0x20cf, 'Currency Symbols（货币符号）'],
  [0x2100, 0x214f, 'Letterlike Symbols（字母式符号）'],
  [0x2190, 0x21ff, 'Arrows（箭头）'],
  [0x2200, 0x22ff, 'Mathematical Operators（数学运算符）'],
  [0x25a0, 0x25ff, 'Geometric Shapes（几何图形）'],
  [0x3000, 0x303f, 'CJK Symbols and Punctuation（中文标点）'],
  [0x3040, 0x309f, 'Hiragana（平假名）'],
  [0x30a0, 0x30ff, 'Katakana（片假名）'],
  [0x3400, 0x4dbf, 'CJK Unified Ideographs Extension A'],
  [0x4e00, 0x9fff, 'CJK Unified Ideographs（中日韩统一汉字）'],
  [0xa000, 0xa48f, 'Yi Syllables（彝文）'],
  [0xac00, 0xd7af, 'Hangul Syllables（谚文音节）'],
  [0xf900, 0xfaff, 'CJK Compatibility Ideographs（兼容汉字）'],
  [0xfe30, 0xfe4f, 'CJK Compatibility Forms'],
  [0xff00, 0xffef, 'Halfwidth and Fullwidth Forms（全半角）'],
  [0x1f300, 0x1f5ff, 'Miscellaneous Symbols and Pictographs（符号与图形）'],
  [0x1f600, 0x1f64f, 'Emoticons（表情符号）'],
]

/** 码点所在区块；没有覆盖到的区块就报码点区间 */
export function blockOf(code: number): string {
  for (const [from, to, name] of BLOCKS) {
    if (code >= from && code <= to) return name
  }
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0') + ' 附近（未收录区块名）'
}

/** 命中的字符集列表 */
export function charsetsOf(code: number): string[] {
  return CHARSETS.filter((set) => set.inRange(code)).map((set) => set.name)
}

/** 单个字符的查询报告 */
export function describeChar(char: string): string {
  const code = char.codePointAt(0) ?? 0
  const utf8 = new TextEncoder().encode(char)
  const utf16 = char.length
  const lines = [
    '字符：' + char,
    '码点：U+' + code.toString(16).toUpperCase().padStart(4, '0'),
    'UTF-8 字节：' +
      utf8.length +
      '（' +
      [...utf8].map((b) => b.toString(16).padStart(2, '0')).join(' ') +
      '）',
    'UTF-16 码元：' + utf16 + (utf16 > 1 ? '（需要代理对）' : ''),
    'Unicode 区块：' + blockOf(code),
    '所属字符集：' + (charsetsOf(code).join('、') || '（不在下列常见字符集内）'),
  ]
  return lines.join('\n')
}

/** 逐字符查询：按码点逐个给出报告，中间空一行分隔 */
export function transform(input: CharsetLookupInput): string {
  const chars = [...input.text].filter((ch) => ch !== '\n' && ch !== ' ')
  if (chars.length === 0) return ''
  return chars.map(describeChar).join('\n\n')
}
