/**
 * favicon-gen —— 多尺寸 favicon 生成的纯函数层（#628）
 *
 * 纯 JS：只做纯计算——目标尺寸列表、各尺寸目标宽高、zip 条目名、
 * 文件类型校验。canvas 缩放与 fflate 打包是浏览器 API，放在 Tool.tsx。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 生成的六种标准尺寸 */
export const FAVICON_SIZES: readonly number[] = [16, 32, 48, 180, 192, 512]

/** 单个尺寸的生成计划：目标宽高与 zip 条目名 */
export interface FaviconSizePlan {
  readonly size: number
  readonly width: number
  readonly height: number
  readonly entryName: string
}

/** zip 条目名：favicon-16x16.png */
export function zipEntryName(size: number): string {
  return `favicon-${size}x${size}.png`
}

/** 单个 PNG 下载文件名：与 zip 条目名一致 */
export function pngFileName(size: number): string {
  return zipEntryName(size)
}

/**
 * 纯计算：返回各尺寸的目标宽高与 zip 条目名。
 * favicon 为正方形，目标宽高即尺寸本身。
 */
export function scaleSizes(): readonly FaviconSizePlan[] {
  return FAVICON_SIZES.map((size) => ({
    size,
    width: size,
    height: size,
    entryName: zipEntryName(size),
  }))
}

/** 是否图片 MIME 类型（如 image/png、image/jpeg、image/svg+xml） */
export function isImageFile(mimeType: string): boolean {
  return (mimeType ?? '').toLowerCase().startsWith('image/')
}
