/**
 * qr-scan 纯函数：文件大小校验、识别尺寸计算、码制名称映射、错误消息提取。
 * 不触碰 DOM/Canvas，不依赖 zxing 类，可 100% 单测。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 识别前最大边：大图先等比缩放至此尺寸再解码，提速 */
export const SCAN_MAX_DIMENSION = 2000

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 识别用尺寸：最大边超过 SCAN_MAX_DIMENSION 则等比缩放，否则原样返回。
 * 仿 image-compress 的 computeOutputDimensions。
 */
export function computeScanDimensions(
  srcW: number,
  srcH: number,
): { width: number; height: number } {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  const longest = Math.max(srcW, srcH)
  if (longest <= SCAN_MAX_DIMENSION) return { width: srcW, height: srcH }
  const scale = SCAN_MAX_DIMENSION / longest
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  }
}

/**
 * zxing BarcodeFormat 枚举名 → 中文码制名。
 * 本工具 hints 限定为 QR_CODE，映射表保留扩展位；未知码制原样返回枚举名。
 */
export function formatBarcodeFormat(fmt: string): string {
  const names: Record<string, string> = {
    QR_CODE: '二维码',
  }
  return names[fmt] ?? fmt
}
