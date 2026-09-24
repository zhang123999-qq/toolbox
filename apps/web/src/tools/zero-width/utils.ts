import type { ZeroWidthInput, ZeroWidthOptions } from './schema'

/** 零宽与方向控制字符：隐写水印通常用这一类 */
const ZERO_WIDTH = new Set([
  0x200b, // 零宽空格
  0x200c, // 零宽非连接符
  0x200d, // 零宽连接符
  0x200e, // 左至右标记
  0x200f, // 右至左标记
  0x202a, // 左至右嵌入
  0x202b, // 右至左嵌入
  0x202c, // 方向格式化结束
  0x202d, // 左至右重写
  0x202e, // 右至左重写
  0x2060, // 词连接符
  0x2061, // 函数应用
  0x2062, // 不可见乘号
  0x2063, // 不可见分隔符
  0x2064, // 不可见加号
  0xfeff, // 零宽不换行空格（BOM）
])

const NAMES: Record<number, string> = {
  0x200b: '零宽空格',
  0x200c: '零宽非连接符',
  0x200d: '零宽连接符',
  0x200e: '左至右标记',
  0x200f: '右至左标记',
  0x2060: '词连接符',
  0xfeff: '零宽不换行空格（BOM）',
}

/** 是否零宽 / 方向控制字符 */
export function isZeroWidth(code: number): boolean {
  return ZERO_WIDTH.has(code)
}

/** 名称：有名的用专名，其余给统称 */
export function nameOf(code: number): string {
  return NAMES[code] ?? '零宽 / 方向控制字符'
}

/** 码位转 U+XXXX */
export function hexOf(code: number): string {
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0')
}

/** 检测 / 删除 / 抽出零宽字符 */
export function transform(input: ZeroWidthInput, options: ZeroWidthOptions): string {
  if (input.text === '') return ''
  const chars = [...input.text]
  const hits = chars.filter((ch) => isZeroWidth(ch.codePointAt(0) ?? 0))

  if (options.mode === 'remove') {
    return chars.filter((ch) => !isZeroWidth(ch.codePointAt(0) ?? 0)).join('')
  }
  if (options.mode === 'extract') {
    if (hits.length === 0) return '未检测到零宽字符'
    return hits.map((ch) => hexOf(ch.codePointAt(0) ?? 0)).join(' ')
  }

  if (hits.length === 0) return '未检测到零宽字符'
  const out: string[] = []
  let run = 0
  let longest = 0
  input.text.split('\n').forEach((line, lineIndex) => {
    let column = 0
    for (const ch of line) {
      column += 1
      const code = ch.codePointAt(0) ?? 0
      if (isZeroWidth(code)) {
        run += 1
        longest = Math.max(longest, run)
        out.push(
          '第 ' + (lineIndex + 1) + ' 行第 ' + column + ' 列：' + hexOf(code) + ' ' + nameOf(code),
        )
      } else {
        run = 0
      }
    }
  })
  out.push('共 ' + hits.length + ' 处')
  // 连续 8 个以上的零宽字符基本不可能是排版需要，多半是嵌入的水印
  if (longest >= 8) out.push('注意：连续零宽字符最长 ' + longest + ' 个，疑似嵌入了隐藏水印。')
  return out.join('\n')
}
