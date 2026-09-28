import type { ShadowGenInput, ShadowGenOptions } from './schema'

/** 阴影样式 */
export const SHADOW_STYLES = ['soft', 'colored', 'neon', 'inset'] as const

/** 解析带范围的数字选项：空用默认值，越界抛中文错 */
export function parseNum(raw: string, name: string, def: number, min: number, max: number): number {
  const v = raw.trim()
  if (v === '') return def
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < min || n > max) throw new Error(`${name}须在 ${min}–${max} 之间（当前 ${v}）`)
  return n
}

/** 校验颜色：#rgb/#rrggbb/#rrggbbaa 或 rgb()/rgba()/hsl()/hsla() 或命名色 */
export function parseColor(raw: string, name: string, def: string): string {
  const v = raw.trim()
  if (v === '') return def
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v
  if (/^(rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/.test(v)) return v
  if (/^[a-zA-Z]+$/.test(v)) return v
  throw new Error(`${name}格式非法：${v}（请使用 HEX / rgb() / 命名色）`)
}

/** 解析样式：默认 soft，非法抛错 */
export function parseStyle(raw: string): 'soft' | 'colored' | 'neon' | 'inset' {
  const v = raw.trim()
  if (v === '') return 'soft'
  if ((SHADOW_STYLES as readonly string[]).includes(v))
    return v as 'soft' | 'colored' | 'neon' | 'inset'
  throw new Error(`阴影样式非法：${v}（可选 soft / colored / neon / inset）`)
}

/** 单层阴影：第 i 层（0 起）偏移与模糊逐层递增 */
function buildLayer(
  i: number,
  base: { ox: number; oy: number; blur: number; spread: number },
  color: string,
  inset: boolean,
): string {
  const scale = i + 1
  const ox = base.ox * scale
  const oy = base.oy * scale
  const blur = base.blur * scale
  const insetKw = inset ? 'inset ' : ''
  return `${insetKw}${ox}px ${oy}px ${blur}px ${base.spread}px ${color}`
}

/** 生成全部阴影层 */
export function buildLayers(options: ShadowGenOptions, baseColor: string | null): string[] {
  const layers = parseNum(options.layers, '层数', 1, 1, 5)
  const ox = parseNum(options.offsetX, '水平偏移', 0, -50, 50)
  const oy = parseNum(options.offsetY, '垂直偏移', 10, -50, 50)
  const blur = parseNum(options.blur, '模糊半径', 20, 0, 100)
  const spread = parseNum(options.spread, '扩散半径', 0, -30, 30)
  const color = parseColor(options.color, '阴影颜色', 'rgba(0,0,0,0.15)')
  const style = parseStyle(options.style)

  const base = { ox, oy, blur, spread }
  const out: string[] = []
  for (let i = 0; i < layers; i++) {
    if (style === 'neon') {
      // 霓虹：无偏移、大模糊、发光色
      const glow = baseColor ?? '#00e5ff'
      out.push(`0px 0px ${(i + 1) * 12 + 4}px ${glow}`)
    } else if (style === 'colored') {
      const glow = baseColor ?? '#3b82f6'
      out.push(buildLayer(i, base, glow, false))
    } else if (style === 'inset') {
      out.push(buildLayer(i, base, color, true))
    } else {
      out.push(buildLayer(i, base, color, false))
    }
  }
  return out
}

/** T2 入口：返回完整 CSS（含 .shadow 包装） */
export function transform(input: ShadowGenInput, options: ShadowGenOptions): string {
  const baseColor = input.text.trim() === '' ? null : parseColor(input.text, '基础色', '#3b82f6')
  const layers = buildLayers(options, baseColor)
  return `.shadow {\n  box-shadow: ${layers.join(',\n              ')};\n}`
}
