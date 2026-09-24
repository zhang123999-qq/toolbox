import { displayWidth } from '../../lib/text'
import type { TextWrapInput, TextWrapOptions } from './schema'

/**
 * 切分单元：拉丁词（含其后空格）、单个 CJK 字符与标点、连续空白。
 * 这样中文按字断、英文按词断，两种混排也能各自体面。
 */
const TOKEN =
  /[A-Za-z0-9À-ɏ'’\-_./]+[ \t]*|[\u3400-\u4dbf\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]|[ \t]+|[^\s]/gu

export function tokenize(line: string): string[] {
  return line.match(TOKEN) ?? []
}

/** 按显示列宽把一段切成长度不超过 width 的片段 */
export function hardBreak(segment: string, width: number): string[] {
  const out: string[] = []
  let current = ''
  let size = 0
  for (const ch of segment) {
    const w = displayWidth(ch)
    if (size + w > width && current !== '') {
      out.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += w
  }
  if (current !== '') out.push(current)
  return out
}

/** 贪心填行：逐个单元塞进去，塞不下就换行；行尾空白不留 */
export function wrapLine(line: string, width: number, mode: string, breakLong: boolean): string[] {
  const units = mode === 'char' ? [...line] : tokenize(line)
  const lines: string[] = []
  let current = ''
  let size = 0
  const flush = () => {
    if (current === '') return
    lines.push(current.replace(/[ \t]+$/, ''))
    current = ''
    size = 0
  }

  for (const unit of units) {
    // 行首的空白不保留：那是原文缩进，折行后没意义
    if (current === '' && unit.trim() === '') continue
    const w = displayWidth(unit)
    // 单个单元就超宽：要么硬切，要么让它独占一行
    if (w > width) {
      flush()
      if (!breakLong) {
        lines.push(unit)
        continue
      }
      const parts = hardBreak(unit, width)
      lines.push(...parts.slice(0, -1))
      current = parts[parts.length - 1] ?? ''
      size = displayWidth(current)
      continue
    }
    if (size + w > width) flush()
    current += unit
    size += w
  }
  flush()
  return lines
}

/** 折行：逐行独立处理，不重排段落 */
export function transform(input: TextWrapInput, options: TextWrapOptions): string {
  if (input.text === '') return ''
  const width = Math.max(1, Number(options.width) || 40)
  return input.text
    .split(/\r?\n/)
    .flatMap((line) => {
      if (line.trim() === '') return ['']
      const wrapped = wrapLine(line, width, options.mode, options.breakLong)
      return wrapped.length === 0 ? [''] : wrapped
    })
    .join('\n')
}
