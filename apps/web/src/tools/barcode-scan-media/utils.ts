/**
 * barcode-scan-media —— 条码扫描的纯函数层
 *
 * 约定：@zxing/browser 的动态 import 只出现在 Tool.tsx，
 * 本文件只做条码格式映射 / 结果归一化 / 报告格式化，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 条码格式中文映射
// ---------------------------------------------------------------------------

/** ZXing 条码格式名 → 中文说明（未收录的返回「未知格式」兜底） */
export function barcodeFormatLabel(formatName: string): string {
  const labels: Record<string, string> = {
    QR_CODE: '二维码（QR Code）',
    AZTEC: '二维码（Aztec）',
    DATA_MATRIX: '二维码（Data Matrix）',
    PDF_417: '二维码（PDF417）',
    MAXICODE: '二维码（MaxiCode）',
    EAN_13: '一维条码（EAN-13，商品条码）',
    EAN_8: '一维条码（EAN-8，商品条码）',
    UPC_A: '一维条码（UPC-A，商品条码）',
    UPC_E: '一维条码（UPC-E，商品条码）',
    CODE_128: '一维条码（Code 128）',
    CODE_39: '一维条码（Code 39）',
    CODE_93: '一维条码（Code 93）',
    CODABAR: '一维条码（Codabar）',
    ITF: '一维条码（ITF，物流条码）',
    RSS_14: '一维条码（RSS-14）',
    RSS_EXPANDED: '一维条码（RSS Expanded）',
  }
  return labels[formatName] ?? `未知格式（${formatName}）`
}

// ---------------------------------------------------------------------------
// 结果归一化与报告
// ---------------------------------------------------------------------------

/** ZXing 解码结果的最小形状（只取用到的字段） */
export interface ZxingDecodeResult {
  readonly text: string
  readonly formatName: string
}

/** 归一化解码结果：空文本 → null，否则返回 {文本, 格式中文名} */
export function normalizeDecodeResult(
  result: ZxingDecodeResult | null | undefined,
): { text: string; formatLabel: string } | null {
  if (!result) return null
  if (typeof result.text !== 'string' || result.text === '') return null
  return { text: result.text, formatLabel: barcodeFormatLabel(result.formatName) }
}

/** 扫描结果报告：格式 + 内容 + 字符数 */
export function buildScanReport(text: string, formatLabel: string): string {
  const MAX_SHOW = 2000
  const shown = text.length > MAX_SHOW ? text.slice(0, MAX_SHOW) + '…' : text
  return [`解码成功：${formatLabel}（${text.length} 个字符）`, shown].join('\n')
}

/** 未扫到条码时的中文提示 */
export function noCodeFoundMessage(): string {
  return '未在画面中识别到条码：请把条码置于画面中央、保持对焦清晰后重试'
}

/** 判断 ZXing 回调里的 err 是否为「未找到条码」类可忽略错误（名字含 NotFound 即视为未找到） */
export function isNotFoundError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : ''
  return name.includes('NotFound')
}
