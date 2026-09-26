import type { GridGeneratorInput, GridGeneratorOptions } from './schema'

const MAX_INPUT = 200_000

/** 校验轨道模板：只允许数字/单位/fr/%/px/rem/auto 与空格 */
export function normalizeTracks(tracks: string, name: string): string {
  const trimmed = tracks.trim()
  if (trimmed === '') return 'none'
  if (/^([a-zA-Z0-9.%]+(px|rem|em|fr|%)?|\s)+$/.test(trimmed)) return trimmed
  throw new Error(`${name} 格式非法：请输入轨道模板，如 1fr 1fr 1fr`)
}

export function normalizeGap(gap: string): string {
  const trimmed = gap.trim()
  if (trimmed === '') return '0'
  if (/^[\d.]+(px|rem|em|%)?$/.test(trimmed)) return trimmed
  throw new Error('gap 格式非法：请输入数字或带单位的长度')
}

export function buildCss(options: GridGeneratorOptions): string {
  const columns = normalizeTracks(options.columns, 'columns')
  const rows = normalizeTracks(options.rows, 'rows')
  const gap = normalizeGap(options.gap)
  const lines = [
    '.container {',
    '  display: grid;',
    `  grid-template-columns: ${columns};`,
    rows === 'none' ? undefined : `  grid-template-rows: ${rows};`,
    `  gap: ${gap};`,
    `  justify-items: ${options.justifyItems};`,
    `  align-items: ${options.alignItems};`,
    '}',
  ].filter((line) => line !== undefined)
  return lines.join('\n')
}

export function transform(input: GridGeneratorInput, options: GridGeneratorOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildCss(options)
}
