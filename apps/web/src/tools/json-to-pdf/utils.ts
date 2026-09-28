import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { JsonToPdfInput, JsonToPdfOptions } from './schema'

/** A4 纸张尺寸（pt） */
export const PAGE_WIDTH = 595.28
export const PAGE_HEIGHT = 841.89

/** 文本输入上限（字符），与 schema 的 max 保持一致 */
export const MAX_INPUT_CHARS = 100000

/** pdf-lib 的 StandardFonts 使用 WinAnsi 编码，画不出中文字符，直接给出中文错误 */
export const CJK_ERROR = '暂不支持中文字符：pdf-lib 内置字体仅支持 Latin-1 编码，请使用英文内容'

/** 排版后的逻辑行：先把输入解析成 DocLine，再统一渲染、换行、分页 */
export interface DocLine {
  readonly text: string
  readonly size: number
  readonly bold: boolean
  readonly mono: boolean
  readonly indent: number
  readonly spaceAfter: number
  readonly rule: boolean
  readonly align: 'left' | 'center'
}

/** 生成结果：PDF 二进制 + 页数（供界面展示） */
export interface PdfResult {
  readonly bytes: Uint8Array
  readonly pages: number
}

/** 拒绝非 Latin-1 字符：这类字符用内置字体画出来是乱码，不如直接报错 */
export function assertLatin1(text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 0xff) throw new Error(CJK_ERROR)
  }
}

/** 输入三连检：空输入 / 超长 / 含中文，全部给出中文错误 */
export function checkTextInput(text: string, what: string): void {
  if (text.trim() === '') throw new Error(`请输入${what}`)
  if (text.length > MAX_INPUT_CHARS) throw new Error(`${what}超过 100,000 字符上限`)
  assertLatin1(text)
}

/** 按空格分词换行；单个超长单词独占一行（允许轻微溢出，不断词） */
export function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    const candidate = current === '' ? word : current + ' ' + word
    if (current === '' || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  lines.push(current)
  return lines
}

/** 按 mono/bold 组合选字体：四个分支都要走到，测试里逐一覆盖 */
function pickFont(
  line: DocLine,
  helv: PDFFont,
  helvBold: PDFFont,
  courier: PDFFont,
  courierBold: PDFFont,
): PDFFont {
  if (line.mono && line.bold) return courierBold
  if (line.mono) return courier
  if (line.bold) return helvBold
  return helv
}

/** 把排版行渲染为 PDF：逐行绘制，自动换行、自动分页 */
export async function renderDocLines(
  lines: readonly DocLine[],
  margin: number,
): Promise<PdfResult> {
  const doc = await PDFDocument.create()
  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const courier = await doc.embedFont(StandardFonts.Courier)
  const courierBold = await doc.embedFont(StandardFonts.CourierBold)
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - margin
  const newPage = (): void => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - margin
  }
  for (const line of lines) {
    assertLatin1(line.text)
    const font = pickFont(line, helv, helvBold, courier, courierBold)
    const lineHeight = line.size * 1.35
    if (line.rule) {
      if (y < margin + 8) newPage()
      page.drawLine({
        start: { x: margin, y },
        end: { x: PAGE_WIDTH - margin, y },
        thickness: 1,
        color: rgb(0.55, 0.55, 0.55),
      })
      y -= 6 + line.spaceAfter
      continue
    }
    const maxWidth = PAGE_WIDTH - margin * 2 - line.indent
    for (const chunk of wrapLine(line.text, font, line.size, maxWidth)) {
      if (y - lineHeight < margin) newPage()
      const chunkWidth = font.widthOfTextAtSize(chunk, line.size)
      const x = line.align === 'center' ? (PAGE_WIDTH - chunkWidth) / 2 : margin + line.indent
      page.drawText(chunk, { x, y: y - line.size, font, size: line.size, color: rgb(0, 0, 0) })
      y -= lineHeight
    }
    y -= line.spaceAfter
  }
  const bytes = await doc.save()
  return { bytes, pages: doc.getPageCount() }
}

/** JSON 解析：失败给出中文错误（不暴露英文解析器原文） */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败：请检查括号、引号、逗号是否配对完整')
  }
}

/** 格式化打印：2 空格缩进，等宽排版 */
export function jsonToDocLines(value: unknown, size: number): DocLine[] {
  const pretty = JSON.stringify(value, null, 2)
  return pretty.split('\n').map((raw) => ({
    text: raw,
    size,
    bold: false,
    mono: true,
    indent: 12,
    spaceAfter: 1,
    rule: false,
    align: 'left' as const,
  }))
}

/** 入口：校验 → 解析 → 格式化 → 渲染 */
export async function buildPdf(
  input: JsonToPdfInput,
  options: JsonToPdfOptions,
): Promise<PdfResult> {
  checkTextInput(input.text, 'JSON 内容')
  const value = parseJson(input.text)
  return renderDocLines(jsonToDocLines(value, Number(options.fontSize)), Number(options.margin))
}
