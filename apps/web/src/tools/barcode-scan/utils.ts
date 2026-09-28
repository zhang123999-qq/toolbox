/**
 * barcode-scan 纯函数：文件大小校验、识别用图尺寸计算、码制名映射。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 识别用图最大边：大图先等比缩放到该尺寸再解码，提速且不影响识别率 */
export const MAX_SCAN_DIMENSION = 2000

/**
 * 支持识别的一维码制（@zxing/library BarcodeFormat 枚举键名）。
 * 与 Tool.tsx 中传给 DecodeHintType.POSSIBLE_FORMATS 的列表保持一致。
 */
export const SUPPORTED_FORMATS = [
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_128',
  'CODE_39',
  'ITF',
] as const

export type SupportedBarcodeFormat = (typeof SUPPORTED_FORMATS)[number]

/** 码制枚举键名（如 'EAN_13'）→ 中文名 */
const FORMAT_DISPLAY_NAMES: Record<string, string> = {
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  UPC_A: 'UPC-A',
  UPC_E: 'UPC-E',
  CODE_128: 'Code 128',
  CODE_39: 'Code 39',
  ITF: 'ITF',
  CODABAR: '库德巴码',
  QR_CODE: '二维码',
  DATA_MATRIX: 'Data Matrix',
  AZTEC: 'Aztec 码',
  PDF_417: 'PDF417',
  MAXICODE: 'MaxiCode',
  RSS_14: 'RSS-14',
  RSS_EXPANDED: 'RSS 扩展码',
}

/** 码制枚举键名转中文名；未知键名原样返回 */
export function formatBarcodeFormat(fmt: string): string {
  return FORMAT_DISPLAY_NAMES[fmt] ?? fmt
}

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

/** 按识别上限等比缩放；任一边超限才缩，不过限原样返回 */
export function computeScanDimensions(
  srcW: number,
  srcH: number,
): { width: number; height: number } {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  const longest = Math.max(srcW, srcH)
  if (longest <= MAX_SCAN_DIMENSION) return { width: srcW, height: srcH }
  const scale = MAX_SCAN_DIMENSION / longest
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  }
}
