/**
 * pdf-ocr 纯函数：文件校验（魔数/大小）、语言解析、渲染尺寸计算、
 * 结果文本合并与页码标注、进度换算、worker 安全终止。
 * 不触碰 DOM/React，不 import 其他工具；pdfjs-dist / tesseract.js 只在 Tool.tsx 中使用。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** OCR 渲染缩放：2.0 = 144 DPI，识别精度与速度的平衡点 */
export const OCR_RENDER_SCALE = 2
/** Canvas 单边像素上限（主流浏览器的安全边界） */
export const MAX_CANVAS_DIMENSION = 16384
/** Canvas 总像素上限 */
export const MAX_CANVAS_PIXELS = MAX_CANVAS_DIMENSION * MAX_CANVAS_DIMENSION

/** tesseract.js 语言代码 */
export const LANG_CHI_SIM = 'chi_sim'
export const LANG_ENG = 'eng'

/** tesseract worker 最小接口：仅含本工具用到的两个方法，便于 mock */
export interface OcrWorker {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>
  terminate: () => Promise<unknown>
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为 PDF。
 */
export function isPdfFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 是否为 pdfjs 抛出的加密 PDF 错误。
 * pdfjs 的异常类在构造时设置 this.name（跨 realm 也稳定），
 * 按 name 识别比 instanceof 更可靠。
 */
export function isPasswordPdfError(err: unknown): boolean {
  return err instanceof Error && err.name === 'PasswordException'
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
 * 校验单页渲染尺寸并取整：viewport 已由 getViewport({ scale }) 缩放，
 * 此处只做合法性校验（任一边 ≤0 / 非有限数视为非法）与总像素上限检查；
 * 超限抛错（调用方记为该页失败，继续下一页）。
 */
export function computeRenderDimensions(
  viewportWidth: number,
  viewportHeight: number,
): { width: number; height: number } {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    throw new Error('页面尺寸无效')
  }
  const width = Math.max(1, Math.round(viewportWidth))
  const height = Math.max(1, Math.round(viewportHeight))
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new Error(`页面渲染尺寸过大（${width}×${height}），已跳过该页`)
  }
  return { width, height }
}

/** 合并文本中的页码标注头：—— 第 N 页 —— */
export function pageHeaderText(page: number): string {
  return `—— 第 ${page} 页 ——`
}

/**
 * 单页识别结果块：页码头 + 正文；正文经 trim 后为空时
 * 填占位行（与「识别失败」区分：空页不是错误）。
 */
export function formatPageBlock(page: number, text: string): string {
  const body = text.trim()
  if (body === '') return `${pageHeaderText(page)}\n（本页未识别出文字）`
  return `${pageHeaderText(page)}\n${body}`
}

/** 单页失败的结果块：页码头 + 失败原因，失败不中断整体 */
export function formatFailedBlock(page: number, reason: string): string {
  return `—— 第 ${page} 页（识别失败：${reason}） ——`
}

/** 按页合并：页与页之间空一行分隔 */
export function mergePageTexts(blocks: string[]): string {
  return blocks.join('\n\n')
}

/** 构造输出文件名：原名去扩展名 + -ocr.txt，空名兜底 document */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-ocr.txt`
}

/**
 * 总进度 0–1：已完成页数 + 当前页内识别进度，再除以总页数；
 * total ≤ 0 时返回 0（文档加载前的初始态），结果钳制在 [0, 1]。
 */
export function progressRatio(donePages: number, pageFrac: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, (donePages + pageFrac) / total))
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
