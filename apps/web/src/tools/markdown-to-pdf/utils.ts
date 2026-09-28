import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { MarkdownToPdfInput, MarkdownToPdfOptions } from './schema'

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

/** 标题字号增量：h1/h2/h3 逐级加大，h4 以下统一 +2 */
const HEADING_EXTRA: Record<number, number> = { 1: 10, 2: 7, 3: 4 }

/** Markdown 行级解析：标题分级、列表缩进、引用、代码块等宽、分割线，其余按段落 */
export function parseMarkdown(text: string, base: number): DocLine[] {
  const lines: DocLine[] = []
  let inCode = false
  for (const raw of text.split('\n')) {
    if (raw.startsWith('```')) {
      inCode = !inCode
      continue
    }
    if (inCode) {
      lines.push({
        text: raw,
        size: base - 1,
        bold: false,
        mono: true,
        indent: 12,
        spaceAfter: 1,
        rule: false,
        align: 'left',
      })
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(raw)
    if (heading) {
      const level = heading[1].length
      const extra = HEADING_EXTRA[level] ?? 2
      lines.push({
        text: heading[2],
        size: base + extra,
        bold: true,
        mono: false,
        indent: 0,
        spaceAfter: 8,
        rule: false,
        align: 'left',
      })
      continue
    }
    const list = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw)
    if (list) {
      const depth = Math.floor(list[1].length / 2)
      const ordered = /^\d/.test(list[2])
      const label = ordered ? list[2] : '-'
      lines.push({
        text: `${label} ${list[3]}`,
        size: base,
        bold: false,
        mono: false,
        indent: 18 + depth * 12,
        spaceAfter: 2,
        rule: false,
        align: 'left',
      })
      continue
    }
    const quote = /^>\s?(.*)$/.exec(raw)
    if (quote) {
      lines.push({
        text: quote[1],
        size: base,
        bold: false,
        mono: false,
        indent: 24,
        spaceAfter: 4,
        rule: false,
        align: 'left',
      })
      continue
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(raw)) {
      lines.push({
        text: '',
        size: base,
        bold: false,
        mono: false,
        indent: 0,
        spaceAfter: 6,
        rule: true,
        align: 'left',
      })
      continue
    }
    if (raw.trim() === '') {
      lines.push({
        text: '',
        size: base,
        bold: false,
        mono: false,
        indent: 0,
        spaceAfter: 6,
        rule: false,
        align: 'left',
      })
      continue
    }
    lines.push({
      text: raw.trim(),
      size: base,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 6,
      rule: false,
      align: 'left',
    })
  }
  return lines
}

/** 入口：校验 → 解析 → 渲染 */
export async function buildPdf(
  input: MarkdownToPdfInput,
  options: MarkdownToPdfOptions,
): Promise<PdfResult> {
  checkTextInput(input.text, 'Markdown 内容')
  return renderDocLines(parseMarkdown(input.text, Number(options.fontSize)), Number(options.margin))
}
