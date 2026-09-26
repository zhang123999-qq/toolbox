import type { BorderRadiusInput, BorderRadiusOptions } from './schema'

const MAX_INPUT = 200_000

/** 校验圆角长度：允许 px/rem/%，无单位补 px */
export function normalizeCorner(value: string, name: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return '0px'
  if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(trimmed)) {
    return /[a-z%]$/.test(trimmed) ? trimmed : trimmed + 'px'
  }
  throw new Error(`${name} 格式非法：请输入数字（可带 px/%/rem 单位）`)
}

export function buildBorderRadius(options: BorderRadiusOptions): string {
  const tl = normalizeCorner(options.tl, '左上角')
  const tr = normalizeCorner(options.tr, '右上角')
  const br = normalizeCorner(options.br, '右下角')
  const bl = normalizeCorner(options.bl, '左下角')
  const shorthand = `border-radius: ${tl} ${tr} ${br} ${bl};`
  const perCorner = [
    `border-top-left-radius: ${tl};`,
    `border-top-right-radius: ${tr};`,
    `border-bottom-right-radius: ${br};`,
    `border-bottom-left-radius: ${bl};`,
  ].join('\n')
  return [shorthand, '', '/* 分别写法 */', perCorner].join('\n')
}

export function transform(input: BorderRadiusInput, options: BorderRadiusOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildBorderRadius(options)
}
