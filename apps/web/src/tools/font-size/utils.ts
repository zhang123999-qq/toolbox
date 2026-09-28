/**
 * font-size（#738）纯函数：流式字号 clamp() 生成、px/rem 换算、可读性评估。
 */

export interface FluidTypeParams {
  readonly minPx: number
  readonly maxPx: number
  readonly minVw: number
  readonly maxVw: number
}

/** 校验数值 */
function validateNum(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new Error(`${name}必须是数字`)
  return value
}

/**
 * 生成 clamp() 流式字号 CSS。
 * 公式：clamp(minPx, intercept + slope*100vw, maxPx)，
 * 其中 slope = (maxPx-minPx)/(maxVw-minVw)，intercept = minPx - slope*minVw。
 */
export function generateFluidType(params: FluidTypeParams): string {
  const minPx = validateNum(params.minPx, '最小字号')
  const maxPx = validateNum(params.maxPx, '最大字号')
  const minVw = validateNum(params.minVw, '最小视口')
  const maxVw = validateNum(params.maxVw, '最大视口')
  if (minPx <= 0 || maxPx <= 0) throw new Error('字号必须大于 0px')
  if (maxPx < minPx) throw new Error('最大字号不能小于最小字号')
  if (minVw <= 0 || maxVw <= 0) throw new Error('视口宽度必须大于 0px')
  if (maxVw <= minVw) throw new Error('最大视口必须大于最小视口')
  const slope = (maxPx - minPx) / (maxVw - minVw)
  const intercept = minPx - slope * minVw
  const slopeVw = slope * 100
  return [
    '/* 流式字号：随视口宽度在最小/最大字号之间平滑缩放 */',
    `font-size: clamp(${fmt(minPx)}px, ${fmt(intercept)}px + ${fmt(slopeVw)}vw, ${fmt(maxPx)}px);`,
  ].join('\n')
}

/** 数字格式化：保留最多 4 位小数，去尾零 */
function fmt(n: number): string {
  return String(Number(n.toFixed(4)))
}

export interface ReadabilityInput {
  readonly fontSizePx: number
  readonly lineLengthChars: number
  readonly lineHeight: number
}

export interface ReadabilityResult {
  /** 0–100 */
  readonly score: number
  readonly issues: readonly string[]
  readonly suggestions: readonly string[]
}

/**
 * 可读性评估。
 * 字号（30 分）：≥16 得 30；14–16 得 20；12–14 得 10；<12 得 0。
 * 行宽（30 分）：45–75 字符得 30；35–45 或 75–90 得 15；其余 0。
 * 行高（40 分）：1.4–1.8 得 40；1.2–1.4 或 1.8–2.2 得 20；其余 0。
 */
export function assessReadability(input: ReadabilityInput): ReadabilityResult {
  const fontSizePx = validateNum(input.fontSizePx, '字号')
  const lineLengthChars = validateNum(input.lineLengthChars, '行宽')
  const lineHeight = validateNum(input.lineHeight, '行高')
  if (fontSizePx <= 0) throw new Error('字号必须大于 0')
  if (lineLengthChars <= 0) throw new Error('行宽必须大于 0')
  if (lineHeight <= 0) throw new Error('行高必须大于 0')

  const issues: string[] = []
  const suggestions: string[] = []
  let score = 0

  if (fontSizePx >= 16) {
    score += 30
  } else {
    issues.push(`正文字号 ${fontSizePx}px 偏小`)
    suggestions.push('正文字号建议不小于 16px')
    if (fontSizePx >= 14) score += 20
    else if (fontSizePx >= 12) score += 10
  }

  if (lineLengthChars >= 45 && lineLengthChars <= 75) {
    score += 30
  } else {
    issues.push(`行宽 ${lineLengthChars} 字符超出舒适区间`)
    suggestions.push('每行 45–75 个字符阅读最舒适')
    if (
      (lineLengthChars >= 35 && lineLengthChars < 45) ||
      (lineLengthChars > 75 && lineLengthChars <= 90)
    ) {
      score += 15
    }
  }

  if (lineHeight >= 1.4 && lineHeight <= 1.8) {
    score += 40
  } else {
    issues.push(`行高 ${lineHeight} 超出舒适区间`)
    suggestions.push('行高建议设为字号的 1.4–1.8 倍')
    if ((lineHeight >= 1.2 && lineHeight < 1.4) || (lineHeight > 1.8 && lineHeight <= 2.2)) {
      score += 20
    }
  }

  return { score, issues, suggestions }
}

/** px → rem 换算（默认根字号 16px） */
export function pxToRem(px: number, base = 16): { rem: number; css: string } {
  const v = validateNum(px, '像素值')
  const b = validateNum(base, '根字号')
  if (v < 0) throw new Error('像素值不能为负数')
  if (b <= 0) throw new Error('根字号必须大于 0')
  const rem = v / b
  return { rem, css: `${fmt(rem)}rem` }
}

/** rem → px 换算（默认根字号 16px） */
export function remToPx(rem: number, base = 16): { px: number; css: string } {
  const v = validateNum(rem, 'rem 值')
  const b = validateNum(base, '根字号')
  if (v < 0) throw new Error('rem 值不能为负数')
  if (b <= 0) throw new Error('根字号必须大于 0')
  const px = v * b
  return { px, css: `${fmt(px)}px` }
}
