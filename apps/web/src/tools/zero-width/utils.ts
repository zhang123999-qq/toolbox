import type { ZeroWidthInput, ZeroWidthOptions } from './schema'
// 零宽判定与命名已上提到 lib：#42 与 #57 / #58 共用同一套口径
import { hexOf, isZeroWidthCode, zeroWidthName } from '../../lib/zerowidth'

/** 是否零宽 / 方向控制字符 */
export function isZeroWidth(code: number): boolean {
  return isZeroWidthCode(code)
}

/** 名称：有名的用专名，其余给统称 */
export function nameOf(code: number): string {
  return zeroWidthName(code)
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
