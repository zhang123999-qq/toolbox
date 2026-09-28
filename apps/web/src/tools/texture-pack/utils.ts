/**
 * texture-pack —— 全局编号 #787
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 纹理打包（图集布局）：
 * validatePackInput 校验矩形列表与图集最大宽度（中文报错）；
 * packRects 使用 shelf 装箱算法计算每个矩形的 {x, y} 位置；
 * exportAtlasJson 导出图集元数据 JSON；renderPackResult 输出文本摘要。
 * canvas 预览只在组件层完成，utils 不触碰 DOM。
 * 无任何运行时依赖。
 */

export interface RectInput {
  /** 矩形 id（唯一） */
  id: string
  /** 宽（px，正整数） */
  w: number
  /** 高（px，正整数） */
  h: number
}

export interface RectPlacement extends RectInput {
  x: number
  y: number
}

export interface PackResult {
  placements: RectPlacement[]
  /** 图集实际宽度（px） */
  atlasW: number
  /** 图集实际高度（px） */
  atlasH: number
  /** 矩形面积总和占图集面积的比例（0-1） */
  utilization: number
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

export function validatePackInput(rects: RectInput[], maxWidth: number): void {
  if (!Array.isArray(rects) || rects.length === 0) throw new Error('矩形列表不能为空')
  if (!isPositiveInt(maxWidth)) throw new Error('图集最大宽度 maxWidth 必须为正整数')
  const seen = new Set<string>()
  for (const r of rects) {
    if (typeof r !== 'object' || r === null) throw new Error('矩形必须是对象')
    if (typeof r.id !== 'string' || r.id.trim() === '') throw new Error('矩形 id 必须为非空字符串')
    if (seen.has(r.id)) throw new Error(`矩形 id 重复：${r.id}`)
    seen.add(r.id)
    if (!isPositiveInt(r.w)) throw new Error(`矩形 ${r.id} 的宽度 w 必须为正整数`)
    if (!isPositiveInt(r.h)) throw new Error(`矩形 ${r.id} 的高度 h 必须为正整数`)
    if (r.w > maxWidth) throw new Error(`矩形 ${r.id} 的宽度 ${r.w} 超过图集最大宽度 ${maxWidth}`)
  }
}

/**
 * shelf 装箱：按高度降序排列，逐行（shelf）放置。
 * 确定性算法：同输入必得同输出。
 */
export function packRects(rects: RectInput[], maxWidth: number): PackResult {
  validatePackInput(rects, maxWidth)
  const sorted = [...rects].sort((a, b) => b.h - a.h || b.w - a.w)
  const placements: RectPlacement[] = []
  let shelfY = 0
  let shelfH = 0
  let shelfX = 0
  let maxUsedW = 0
  for (const r of sorted) {
    if (shelfX + r.w > maxWidth && shelfX > 0) {
      shelfY += shelfH
      shelfX = 0
      shelfH = 0
    }
    placements.push({ ...r, x: shelfX, y: shelfY })
    shelfX += r.w
    if (shelfX > maxUsedW) maxUsedW = shelfX
    if (r.h > shelfH) shelfH = r.h
  }
  const atlasH = shelfY + shelfH
  const rectArea = rects.reduce((s, r) => s + r.w * r.h, 0)
  // 合法输入下必有至少一个矩形，atlasH 与 maxUsedW 恒为正数
  const utilization = rectArea / (maxUsedW * atlasH)
  return { placements, atlasW: maxUsedW, atlasH, utilization }
}

export function exportAtlasJson(result: PackResult): string {
  const frames: Record<string, { x: number; y: number; w: number; h: number }> = {}
  for (const p of result.placements) {
    frames[p.id] = { x: p.x, y: p.y, w: p.w, h: p.h }
  }
  return JSON.stringify(
    {
      meta: {
        size: { w: result.atlasW, h: result.atlasH },
        utilization: Number(result.utilization.toFixed(4)),
      },
      frames,
    },
    null,
    2,
  )
}

export function parsePackInput(text: string): { rects: RectInput[]; maxWidth: number } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('输入必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  const rects = o.rects as RectInput[]
  const maxWidth = o.maxWidth as number
  validatePackInput(rects, maxWidth)
  return { rects, maxWidth }
}

export function renderPackResult(result: PackResult): string {
  const lines = [
    `图集尺寸：${result.atlasW}×${result.atlasH}，空间利用率 ${(result.utilization * 100).toFixed(1)}%`,
    `共 ${result.placements.length} 个矩形：`,
  ]
  for (const p of result.placements) {
    lines.push(`${p.id}: x=${p.x}, y=${p.y}, w=${p.w}, h=${p.h}`)
  }
  return lines.join('\n')
}
