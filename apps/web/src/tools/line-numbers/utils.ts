import type { LineNumbersInput, LineNumbersOptions } from './schema'

/** 四种行号样式：1. / 1: / 1 | / [1] */
const FORMATS: Record<LineNumbersOptions['format'], (value: string) => string> = {
  dot: (value) => value + '. ',
  colon: (value) => value + ': ',
  pipe: (value) => value + ' | ',
  bracket: (value) => '[' + value + '] ',
}

/** 逐行加行号；行号从 1 开始，可按最大位数左补空格对齐 */
export function transform(input: LineNumbersInput, options: LineNumbersOptions): string {
  // 空输入按「没有行」处理，而不是给一个空行编号
  if (input.text === '') return ''
  const lines = input.text.split(/\r?\n/)
  const counted = options.skipEmpty ? lines.filter((line) => line !== '') : lines
  const width = String(counted.length).length
  let current = 0
  return lines
    .map((line) => {
      if (options.skipEmpty && line === '') return line
      current += 1
      const raw = String(current)
      return FORMATS[options.format](options.align ? raw.padStart(width, ' ') : raw) + line
    })
    .join('\n')
}
