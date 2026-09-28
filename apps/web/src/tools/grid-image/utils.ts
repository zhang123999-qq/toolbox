/**
 * grid-image 纯函数：参数解析、网格切分计算、文件名构造。
 * 不触碰 React/DOM/Canvas，可 100% 单测。
 */

/** 网格行列数默认 3（九宫格），范围 1–10 */
export const DEFAULT_GRID_COUNT = 3
export const MAX_GRID_COUNT = 10
/** 质量默认 90 */
export const DEFAULT_QUALITY = 90
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 切分出的单块矩形（源图像素坐标） */
export interface TileSpec {
  x: number
  y: number
  w: number
  h: number
}

/** 输出格式字面量 */
export type GridImageFormat = 'jpeg' | 'png' | 'webp'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析 min–max 闭区间正整数；空串用默认值 */
function parseBoundedInt(
  raw: string,
  label: string,
  min: number,
  max: number,
  defaultValue: number,
): number {
  const t = raw.trim()
  if (t === '') return defaultValue
  if (!/^\d+$/.test(t)) throw new Error(`${label}无效：${raw}（须为 ${min}–${max} 的整数）`)
  const n = Number(t)
  if (n < min || n > max) throw new Error(`${label}超出范围：${raw}（须为 ${min}–${max} 的整数）`)
  return n
}

/** 解析行数 1–10；空串用默认 3 */
export function parseRows(raw: string): number {
  return parseBoundedInt(raw, '行数', 1, MAX_GRID_COUNT, DEFAULT_GRID_COUNT)
}

/** 解析列数 1–10；空串用默认 3 */
export function parseCols(raw: string): number {
  return parseBoundedInt(raw, '列数', 1, MAX_GRID_COUNT, DEFAULT_GRID_COUNT)
}

/** 解析质量 1–100；空串用默认 90 */
export function parseQuality(raw: string): number {
  return parseBoundedInt(raw, '质量', 1, 100, DEFAULT_QUALITY)
}

/**
 * 计算 rows×cols 网格的每块矩形（行优先）。
 * 基础块尺寸 tileW=Math.floor(srcW/cols)、tileH=Math.floor(srcH/rows)；
 * 宽/高不能整除时余数由最后一列/最后一行吸收，保证无缝覆盖全图：
 * 所有 tile 面积之和恒等于 srcW*srcH。
 */
export function computeTiles(srcW: number, srcH: number, rows: number, cols: number): TileSpec[] {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
    throw new Error('行列数无效：须为正整数')
  }
  const tileW = Math.floor(srcW / cols)
  const tileH = Math.floor(srcH / rows)
  if (tileW < 1 || tileH < 1) {
    throw new Error('网格过大：行/列数超过图片尺寸')
  }
  const tiles: TileSpec[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW
      const y = r * tileH
      tiles.push({
        x,
        y,
        // 最后一列吸收宽度余数，最后一行吸收高度余数
        w: c === cols - 1 ? srcW - x : tileW,
        h: r === rows - 1 ? srcH - y : tileH,
      })
    }
  }
  return tiles
}

/** 选项 format 转 MIME */
export function formatToMime(format: GridImageFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/**
 * 构造分块输出文件名：原名去扩展名 + -r{行}c{列} + 格式扩展名。
 * 行列从 1 起，如 photo.png → photo-r1c1.jpg。
 */
export function buildTileFileName(
  originalName: string,
  row: number,
  col: number,
  format: GridImageFormat,
): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-r${row}c${col}.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
