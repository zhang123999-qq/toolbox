/**
 * pdf-ocr 纯函数：OCR 结果合并 / 清洗 / 格式化 / 错误文案 / 进度计算。
 *
 * 不依赖 pdfjs-dist 与 tesseract.js（它们只在 Tool.tsx 里动态 import），
 * 因此本文件可被 vitest 完整覆盖（目标：语句 / 分支 / 函数 / 行 100%）。
 */

import type { PdfOcrOptions } from './schema'

/** 单页 OCR 结果 */
export interface OcrPageResult {
  readonly page: number
  readonly text: string
}

/** PDF 文件的最小信息子集（File 的结构化替身，便于单元测试） */
export interface PdfFileInfo {
  readonly name: string
  readonly size: number
  readonly type: string
}

/** 识别语言（与 schema 的字面量保持一致） */
export type OcrLanguage = PdfOcrOptions['language']

/** OCR 页数上限：tesseract 按页跑 WASM，页数太多会长时间占用标签页 */
export const MAX_OCR_PAGES = 50

/** 文件体积上限：100 MiB */
export const MAX_OCR_BYTES = 100 * 1024 * 1024

/** 页面渲染倍率：2x 是识别率与速度的折中 */
export const OCR_RENDER_SCALE = 2

/** 下拉框里的语言取值（与 schema 一致） */
export const OCR_LANGUAGES: readonly OcrLanguage[] = ['chi_sim+eng', 'eng', 'chi_sim']

/** 语言取值的中文展示名 */
export const OCR_LANGUAGE_LABELS: Record<OcrLanguage, string> = {
  'chi_sim+eng': '中文+英文',
  eng: '英文',
  chi_sim: '中文',
}

/** OCR 进行到的阶段（用于进度文案） */
export type OcrStage = 'loading-pdf' | 'loading-engine' | 'recognizing'

/** 文件前置校验：类型 / 空文件 / 体积；不合法直接抛中文错误 */
export function validateOcrFile(file: PdfFileInfo): void {
  if (file.size === 0) {
    throw new Error('文件为空，请选择有效的 PDF 文件')
  }
  if (file.size > MAX_OCR_BYTES) {
    throw new Error(`文件过大：${(file.size / 1024 / 1024).toFixed(1)} MiB，超过 100 MiB 上限`)
  }
  const name = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
  if (!isPdf) {
    throw new Error('请选择 PDF 文件（.pdf），当前文件不是 PDF 格式')
  }
}

/** 页数校验：0 页视为损坏；超 50 页拒绝并提示拆分 */
export function checkOcrPageCount(total: number): void {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error('无法读取 PDF 页数，文件可能已损坏')
  }
  if (total > MAX_OCR_PAGES) {
    throw new Error(`PDF 共 ${total} 页，超过 ${MAX_OCR_PAGES} 页上限，请拆分后分批识别`)
  }
}

/**
 * 清洗单页 OCR 文本：
 * 统一换行符 → 去掉每行行尾空白 → 连续 3+ 个空行压成 1 个 → 首尾去空。
 */
export function cleanOcrText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 单页块：页眉 + 正文；空白页给占位行（复制时不断行） */
export function formatOcrPage(page: OcrPageResult, total: number): string {
  const body = page.text === '' ? '（本页未识别出文字）' : page.text
  return `第 ${page.page}/${total} 页\n${body}`
}

/** 合并全部页面：页与页之间空一行；无页面时返回空串 */
export function mergeOcrPages(pages: readonly OcrPageResult[]): string {
  if (pages.length === 0) return ''
  return pages.map((page) => formatOcrPage(page, pages.length)).join('\n\n')
}

/** 是否为 pdfjs 抛出的「需要密码」错误 */
export function isPasswordError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    if ((error as { name?: unknown }).name === 'PasswordException') return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return /password/i.test(message)
}

/** PDF 加载阶段的错误 → 中文提示（加密 / 损坏 / 其他） */
export function describePdfError(error: unknown): string {
  if (isPasswordError(error)) {
    return '该 PDF 已加密，不支持 OCR 识别，请先去除密码后重试'
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/invalid pdf|not a pdf|corrupt|损坏/i.test(message)) {
    return '文件损坏或不是有效的 PDF 文件，请检查后重试'
  }
  return `PDF 加载失败：${message}`
}

/**
 * tesseract 引擎加载失败的中文提示。
 * 语言包与 wasm core 都走 CDN（tesseract.js 默认配置），离线或 CDN 不可达时触发；
 * UI 侧保留已完成页面的结果（优雅降级），此处只负责文案。
 */
export function describeOcrEngineError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return (
    `OCR 引擎加载失败（${message}）。` +
    '可能原因：当前离线、或访问语言包 CDN 受限。请检查网络后重试；已完成页面的结果已保留。'
  )
}

/** 各阶段的中文进度文案 */
export function ocrStageText(stage: OcrStage, done: number, total: number): string {
  switch (stage) {
    case 'loading-pdf':
      return '正在加载 PDF…'
    case 'loading-engine':
      return '正在加载 OCR 引擎（首次需从 CDN 下载语言包）…'
    case 'recognizing':
      return `正在识别第 ${done + 1}/${total} 页…`
  }
}

/**
 * 总进度 0–100：已完成页数 + 当前页内进度（tesseract logger 的 progress）。
 * 输入钳制在 [0, 100]，total<=0 时按 0 处理（防除零）。
 */
export function ocrOverallProgress(done: number, total: number, pageFraction: number): number {
  if (total <= 0) return 0
  const fraction = Math.min(Math.max(pageFraction, 0), 1)
  const pct = ((done + fraction) / total) * 100
  return Math.round(Math.min(Math.max(pct, 0), 100))
}
