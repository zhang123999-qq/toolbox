import type { ClocInput, ClocOptions } from './schema'

export interface Count {
  total: number
  code: number
  comment: number
  blank: number
}

/**
 * 统计行数。按语言风格决定注释语法：
 * - c-style：`//` 行注释 + `/* *\/` 块注释
 * - python：`#` 行注释（三引号块注释近似按 `#` 处理）
 * - shell：`#` 行注释（`--` 视为 SQL 风格行注释）
 */
export function countLines(source: string, language: string): Count {
  const lines = source.split('\n')
  let code = 0
  let comment = 0
  let blank = 0
  let inBlock = false

  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') {
      blank += 1
      continue
    }

    if (language === 'c-style') {
      if (inBlock) {
        comment += 1
        if (line.includes('*/')) inBlock = false
        continue
      }
      if (line.startsWith('/*')) {
        comment += 1
        if (!line.includes('*/')) inBlock = true
        continue
      }
      if (line.startsWith('//')) {
        comment += 1
        continue
      }
      code += 1
    } else {
      // python / shell：# 行注释；shell 也认 -- 开头
      if (line.startsWith('#') || (language === 'shell' && line.startsWith('--'))) {
        comment += 1
      } else {
        code += 1
      }
    }
  }

  return { total: lines.length, code, comment, blank }
}

export function render(c: Count): string {
  return [
    '代码行数统计：',
    `  总行数：${c.total}`,
    `  代码行：${c.code}`,
    `  注释行：${c.comment}`,
    `  空行：${c.blank}`,
    `  注释占比：${c.total ? ((c.comment / c.total) * 100).toFixed(1) : '0.0'}%`,
  ].join('\n')
}

export function transform(input: ClocInput, options: ClocOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return render(countLines(input.text, options.language))
}
