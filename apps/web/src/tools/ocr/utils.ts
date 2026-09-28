/**
 * ocr 纯函数：语言解析、识别尺寸计算、进度文案、worker 安全终止。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */
import type { Translate } from '../../i18n'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 识别前最大边：超限等比缩放，平衡识别速度与精度 */
export const OCR_MAX_DIMENSION = 2000

/** tesseract.js 语言代码 */
export const LANG_CHI_SIM = 'chi_sim'
export const LANG_ENG = 'eng'

/** OCR worker 最小接口：仅含本工具用到的两个方法，便于 mock */
export interface OcrWorker {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>
  terminate: () => Promise<unknown>
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

/** 解析语言复选框（'1' 选中 / '' 未选）；至少选一种，否则抛错 */
export function parseLangs(chiSim: string, eng: string): string[] {
  const langs: string[] = []
  if (chiSim === '1') langs.push(LANG_CHI_SIM)
  if (eng === '1') langs.push(LANG_ENG)
  if (langs.length === 0) throw new Error('请至少选择一种识别语言')
  return langs
}

/**
 * 识别前等比缩放：最大边超限才缩到 OCR_MAX_DIMENSION，不过限原样返回（取整）。
 * 任一边 ≤0 / 非有限数视为非法。
 */
export function computeOcrDimensions(
  srcW: number,
  srcH: number,
): { width: number; height: number } {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  const longest = Math.max(srcW, srcH)
  if (longest <= OCR_MAX_DIMENSION) return { width: Math.round(srcW), height: Math.round(srcH) }
  const scale = OCR_MAX_DIMENSION / longest
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  }
}

/**
 * tesseract.js logger status → 进度文案（经 i18n）。
 * 未知 status 原样返回，便于排查。
 */
export function progressText(status: string, progress: number, t: Translate): string {
  switch (status) {
    case 'loading tesseract core':
      return t('ocr.status.loadingCore')
    case 'loading language traineddata':
      return t('ocr.status.loadingLang')
    case 'initializing tesseract':
    case 'initializing api':
      return t('ocr.status.initializing')
    case 'recognizing text':
      return t('ocr.status.recognizing', { percent: Math.round(progress * 100) })
    default:
      return status
  }
}

/** 是否为终态 status（终态后可隐藏进度条） */
export function isTerminalStatus(status: string): boolean {
  return status === 'done' || status === 'failed' || status === 'terminated'
}

/** 安全终止 worker：空值直接跳过；terminate 抛错吞掉（取消/卸载场景） */
export async function terminateWorker(w: OcrWorker | null | undefined): Promise<void> {
  if (w == null) return
  try {
    await w.terminate()
  } catch {
    // 取消或组件卸载时 worker 可能已失效，忽略
  }
}
