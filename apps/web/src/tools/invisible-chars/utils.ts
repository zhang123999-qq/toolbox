import type { InvisibleCharsInput, InvisibleCharsOptions } from './schema'

/** 常见不可见字符的中文名 */
const NAMES: Record<number, string> = {
  0x00a0: '不换行空格',
  0x00ad: '软连字符',
  0x180e: '蒙古文元音分隔符',
  0x200b: '零宽空格',
  0x200c: '零宽非连接符',
  0x200d: '零宽连接符',
  0x200e: '左至右标记',
  0x200f: '右至左标记',
  0x2028: '行分隔符',
  0x2029: '段分隔符',
  0x202a: '左至右嵌入',
  0x202b: '右至左嵌入',
  0x202c: '方向格式化结束',
  0x202d: '左至右重写',
  0x202e: '右至左重写',
  0xfeff: '零宽不换行空格（BOM）',
}

/** 常见空白：默认不算「问题字符」，勾选关闭后也会被处理 */
const COMMON = new Set([0x09, 0x0a, 0x0d])

/** 是否算不可见字符 */
export function isInvisible(code: number, keepCommon: boolean): boolean {
  if (keepCommon && COMMON.has(code)) return false
  if (NAMES[code]) return true
  if (code < 0x20 || code === 0x7f) return true
  if (code >= 0x80 && code <= 0x9f) return true
  if (code >= 0x2000 && code <= 0x200f) return true
  if (code >= 0x2028 && code <= 0x202e) return true
  if (code >= 0x2060 && code <= 0x2064) return true
  if (code >= 0x2066 && code <= 0x2069) return true
  return false
}

/** 名称：有名可查的用专名，其余按区段给统称 */
export function nameOf(code: number): string {
  if (NAMES[code]) return NAMES[code]
  if (code < 0x20 || code === 0x7f) return '控制字符'
  if (code >= 0x80 && code <= 0x9f) return 'C1 控制字符'
  if (code >= 0x2000 && code <= 0x200f) return '空格类字符'
  return '不可见字符'
}

/** 码位转 U+XXXX */
export function hexOf(code: number): string {
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0')
}

/** 检测并标出 / 删除 / 列出不可见字符 */
export function transform(input: InvisibleCharsInput, options: InvisibleCharsOptions): string {
  if (input.text === '') return ''

  const chars = [...input.text]
  if (options.mode === 'remove') {
    return chars.filter((ch) => !isInvisible(ch.codePointAt(0) ?? 0, options.keepCommon)).join('')
  }
  if (options.mode === 'mark') {
    return chars
      .map((ch) => {
        const code = ch.codePointAt(0) ?? 0
        return isInvisible(code, options.keepCommon) ? '[' + hexOf(code) + ']' : ch
      })
      .join('')
  }

  const out: string[] = []
  let total = 0
  input.text.split('\n').forEach((line, lineIndex) => {
    let column = 0
    for (const ch of line) {
      column += 1
      const code = ch.codePointAt(0) ?? 0
      if (!isInvisible(code, options.keepCommon)) continue
      total += 1
      out.push(
        '第 ' + (lineIndex + 1) + ' 行第 ' + column + ' 列：' + hexOf(code) + ' ' + nameOf(code),
      )
    }
  })
  out.push('共 ' + total + ' 处')
  return out.join('\n')
}
