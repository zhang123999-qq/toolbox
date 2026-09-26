import type { FlexGeneratorInput, FlexGeneratorOptions } from './schema'

const MAX_INPUT = 200_000

/** 校验 gap 是否为合法长度（数字 + 可选单位，或空） */
export function normalizeGap(gap: string): string {
  const trimmed = gap.trim()
  if (trimmed === '') return '0'
  if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(trimmed)) return trimmed
  throw new Error('gap 格式非法：请输入数字或带单位的长度（如 12px）')
}

export function buildCss(options: FlexGeneratorOptions): string {
  const gap = normalizeGap(options.gap)
  const lines = [
    '.container {',
    '  display: flex;',
    `  flex-direction: ${options.direction};`,
    `  justify-content: ${options.justify};`,
    `  align-items: ${options.align};`,
    `  flex-wrap: ${options.wrap};`,
    `  gap: ${gap};`,
    '}',
  ]
  return lines.join('\n')
}

export function transform(input: FlexGeneratorInput, options: FlexGeneratorOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildCss(options)
}
