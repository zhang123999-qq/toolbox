/**
 * qr-scan-media —— 二维码扫描的纯函数层
 *
 * 约定：jsqr 的动态 import 只出现在 Tool.tsx，
 * 本文件只做像素校验 / 结果归一化 / 报告格式化，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 像素校验（jsqr 需要 RGBA 字节流）
// ---------------------------------------------------------------------------

/** 校验 RGBA 像素缓冲：长度必须等于 宽×高×4，否则抛中文错 */
export function validateRgbaPixels(width: number, height: number, dataLength: number): void {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`图像尺寸非法：${String(width)}×${String(height)}`)
  }
  if (!Number.isInteger(dataLength) || dataLength < 0) {
    throw new Error(`像素数据长度非法：${String(dataLength)}`)
  }
  if (dataLength !== width * height * 4) {
    throw new Error(`像素数据损坏：期望 ${width * height * 4} 字节，实际 ${dataLength} 字节`)
  }
}

// ---------------------------------------------------------------------------
// 结果归一化与报告
// ---------------------------------------------------------------------------

/** jsqr 的解码结果形状（只取用到的字段） */
export interface JsqrResult {
  readonly data: string
}

/** 归一化 jsqr 结果：null / 空字符串 → null，否则返回解码文本 */
export function normalizeJsqrResult(result: JsqrResult | null | undefined): string | null {
  if (!result) return null
  const text = result.data
  if (typeof text !== 'string' || text === '') return null
  return text
}

/** 粗略判断是否为网址（http/https/mailto 等常见 scheme） */
export function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/|ftp:\/\/|mailto:|tel:)/i.test(text.trim())
}

/**
 * 扫描结果报告：解码文本 + 字符数 + 网址提示。
 * 文本过长时截断展示（保留前 2000 字符）。
 */
export function buildScanReport(text: string): string {
  const MAX_SHOW = 2000
  const shown = text.length > MAX_SHOW ? text.slice(0, MAX_SHOW) + '…' : text
  const lines = [`解码成功（${text.length} 个字符）：`, shown]
  if (looksLikeUrl(text)) lines.push('提示：内容疑似网址，请确认安全后再访问')
  return lines.join('\n')
}

/** 未扫到二维码时的中文提示 */
export function noCodeFoundMessage(): string {
  return '未在画面中识别到二维码：请把二维码置于画面中央、保持光线充足后重试'
}
