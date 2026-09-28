/**
 * chart-theme（#687）工具函数：主题输入校验与 ECharts 主题 / 预览 option 构建。
 * 全部纯函数，便于单测。
 */

export const EXAMPLE_TITLE = '季度销量'
export const EXAMPLE_BACKGROUND = '#ffffff'
export const EXAMPLE_PALETTE = '#5470c6,#91cc75,#fac858,#ee6666,#73c0de'
export const EXAMPLE_FONT = 'sans-serif'
export const EXAMPLE_TITLE_SIZE = '18'

export interface ThemeOpts {
  background: string
  palette: string[]
  fontFamily: string
  titleFontSize: number
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/

/** 校验单个 hex 颜色（#RGB / #RRGGBB），返回小写规范形式 */
export function parseHexColor(raw: string, label: string): string {
  const v = raw.trim().toLowerCase()
  if (!HEX_COLOR.test(v)) {
    throw new Error(`${label}须为 #RGB 或 #RRGGBB 格式，当前为：${raw.trim() || '（空）'}`)
  }
  return v
}

/** 解析逗号分隔的主色板（1–12 个颜色） */
export function parsePalette(raw: string): string[] {
  const items = raw
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (items.length === 0) throw new Error('主色板不能为空，至少填写 1 个颜色')
  if (items.length > 12) throw new Error(`主色板最多 12 个颜色，当前 ${items.length} 个`)
  return items.map((c, i) => parseHexColor(c, `主色板第 ${i + 1} 个颜色`))
}

/** 解析标题字号（10–48 的整数） */
export function parseTitleSize(raw: string): number {
  const v = raw.trim()
  if (!/^\d+$/.test(v)) throw new Error(`标题字号须为正整数，当前为：${v || '（空）'}`)
  const n = Number(v)
  if (n < 10 || n > 48) throw new Error(`标题字号须在 10–48 之间，当前为：${n}`)
  return n
}

/** 解析字体族（非空，长度上限 120） */
export function parseFontFamily(raw: string): string {
  const v = raw.trim()
  if (v === '') throw new Error('字体不能为空')
  if (v.length > 120) throw new Error('字体名称过长（最多 120 字符）')
  return v
}

/** 空输入回退到默认值 */
export function resolveOpt(raw: string, fallback: string): string {
  return raw.trim() === '' ? fallback : raw
}

/** 由校验后的选项生成可直接传给 echarts.init 的主题对象 */
export function buildThemeJson(opts: ThemeOpts): Record<string, unknown> {
  return {
    color: opts.palette,
    backgroundColor: opts.background,
    textStyle: { fontFamily: opts.fontFamily },
    title: {
      textStyle: {
        fontFamily: opts.fontFamily,
        fontSize: opts.titleFontSize,
        fontWeight: 'bold',
      },
    },
    legend: {
      textStyle: { fontFamily: opts.fontFamily },
    },
    tooltip: {
      backgroundColor: 'rgba(50,50,50,0.9)',
      textStyle: { fontFamily: opts.fontFamily },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: '#6e7079' } },
      axisLabel: { fontFamily: opts.fontFamily },
    },
    valueAxis: {
      axisLabel: { fontFamily: opts.fontFamily },
    },
  }
}

/** 主题预览用的示例 option（柱状 + 折线双系列），颜色取自主题色板 */
export function buildPreviewOption(theme: Record<string, unknown>, title: string): Record<string, unknown> {
  const palette = theme.color as string[]
  return {
    title: { text: title, ...(theme.title as Record<string, unknown>) },
    tooltip: {},
    legend: { data: ['销量', '利润'] },
    xAxis: { type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'] },
    yAxis: { type: 'value' },
    series: [
      { name: '销量', type: 'bar', data: [120, 200, 150, 80], itemStyle: { color: palette[0] } },
      {
        name: '利润',
        type: 'line',
        data: [40, 90, 70, 30],
        itemStyle: { color: palette[1 % palette.length] },
      },
    ],
  }
}

/** 解析预览标题（留空则无标题） */
export function parseTitle(raw: string): string {
  const v = raw.trim()
  if (v.length > 60) throw new Error('预览标题最多 60 字符')
  return v
}

export interface ThemeInput {
  title: string
  background: string
  palette: string
  fontFamily: string
  titleSize: string
}

/** 由输入与选项组装主题；任一校验失败即抛中文错 */
export function resolveTheme(input: ThemeInput): { theme: Record<string, unknown>; title: string } {
  const background = parseHexColor(resolveOpt(input.background, EXAMPLE_BACKGROUND), '背景色')
  const palette = parsePalette(resolveOpt(input.palette, EXAMPLE_PALETTE))
  const fontFamily = parseFontFamily(resolveOpt(input.fontFamily, EXAMPLE_FONT))
  const titleFontSize = parseTitleSize(resolveOpt(input.titleSize, EXAMPLE_TITLE_SIZE))
  const opts: ThemeOpts = { background, palette, fontFamily, titleFontSize }
  return { theme: buildThemeJson(opts), title: parseTitle(input.title) }
}
