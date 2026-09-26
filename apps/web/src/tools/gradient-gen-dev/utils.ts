import type { GradientGenInput, GradientGenOptions } from './schema'

const MAX_INPUT = 200_000

/** 校验颜色：#rgb / #rrggbb / #rrggbbaa 或 rgb()/rgba()/hsl()/hsla()/命名色 */
export function assertColor(color: string, name: string): string {
  const trimmed = color.trim()
  if (trimmed === '') throw new Error(`${name} 颜色不能为空`)
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return trimmed
  // rgb()/rgba()/hsl()/hsla() 内部只允许数字、小数点、逗号、百分号、空格、斜杠，防止 ;{} 注入
  if (/^(rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/.test(trimmed)) return trimmed
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed
  throw new Error(`${name} 颜色格式非法：请输入 HEX / rgb() / 命名色`)
}

/** 校验色标位置：百分比 0-100，允许空（空则不输出位置） */
export function normalizePos(pos: string): string {
  const trimmed = pos.trim()
  if (trimmed === '') return ''
  if (/^\d{1,3}(\.\d+)?%$/.test(trimmed)) return ' ' + trimmed
  if (/^\d+(\.\d+)?(px|rem|em)$/.test(trimmed)) return ' ' + trimmed
  throw new Error('色标位置格式非法：如 0% / 50% / 100%')
}

interface Stop {
  readonly color: string
  readonly pos: string
}

export function buildGradient(options: GradientGenOptions): string {
  const stops: Stop[] = [
    { color: assertColor(options.color1, 'color1'), pos: normalizePos(options.pos1) },
    { color: assertColor(options.color2, 'color2'), pos: normalizePos(options.pos2) },
  ]
  if (options.color3.trim() !== '') {
    stops.push({ color: assertColor(options.color3, 'color3'), pos: normalizePos(options.pos3) })
  }
  const stopText = stops.map((s) => `${s.color}${s.pos}`).join(', ')

  let body: string
  if (options.type === 'linear') {
    const angle = options.angle.trim() === '' ? '180deg' : `${Number(options.angle)}deg`
    if (Number.isNaN(Number(options.angle)) && options.angle.trim() !== '') {
      throw new Error('角度格式非法：请输入数字（度）')
    }
    body = `linear-gradient(${angle}, ${stopText})`
  } else if (options.type === 'radial') {
    body = `radial-gradient(circle, ${stopText})`
  } else {
    const angle = options.angle.trim() === '' ? '0deg' : `${Number(options.angle)}deg`
    if (Number.isNaN(Number(options.angle)) && options.angle.trim() !== '') {
      throw new Error('角度格式非法：请输入数字（度）')
    }
    body = `conic-gradient(from ${angle}, ${stopText})`
  }
  return `background: ${body};`
}

export function transform(input: GradientGenInput, options: GradientGenOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildGradient(options)
}
