import type { BoxShadowInput, BoxShadowOptions } from './schema'

const MAX_INPUT = 200_000

/** 校验长度值：允许负数、小数，无单位时补 px */
export function assertLength(value: string, name: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return '0px'
  if (/^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(trimmed)) {
    return /[a-z%]$/.test(trimmed) ? trimmed : trimmed + 'px'
  }
  throw new Error(`${name} 格式非法：请输入数字（可带 px 单位）`)
}

export function assertColor(color: string): string {
  const trimmed = color.trim()
  if (trimmed === '') throw new Error('阴影颜色不能为空')
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return trimmed
  if (/^(rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/.test(trimmed)) return trimmed
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed
  throw new Error('阴影颜色格式非法：请输入 HEX / rgb() / 命名色')
}

export function buildBoxShadow(options: BoxShadowOptions): string {
  const x = assertLength(options.offsetX, 'offsetX')
  const y = assertLength(options.offsetY, 'offsetY')
  const blur = assertLength(options.blur, 'blur')
  const spread = assertLength(options.spread, 'spread')
  const color = assertColor(options.color)
  const inset = options.inset ? 'inset ' : ''
  return `box-shadow: ${inset}${x} ${y} ${blur} ${spread} ${color};`
}

export function transform(input: BoxShadowInput, options: BoxShadowOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildBoxShadow(options)
}
