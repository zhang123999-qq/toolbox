import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { ReceiptInput } from './schema'

/** A4 纸张尺寸（pt） */
export const PAGE_WIDTH = 595.28
export const PAGE_HEIGHT = 841.89

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

/** 收据明细行 */
export interface ReceiptItem {
  readonly name: string
  readonly quantity: number
  readonly price: number
  readonly amount: number
}

/** 收据完整数据（含计算出的总计） */
export interface ReceiptData {
  readonly merchant: string
  readonly date: string
  readonly payment: string
  readonly items: readonly ReceiptItem[]
  readonly total: number
}

/** 金额保留两位小数（避免 0.1+0.2 类浮点误差） */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 金额展示：123 → "123.00" */
export function formatMoney(n: number): string {
  return n.toFixed(2)
}

/**
 * 解析明细：每行"品名,数量,单价"（英文逗号）。
 * 空行跳过；格式/数字非法时报错并带行号。
 */
export function parseItems(text: string): ReceiptItem[] {
  const items: ReceiptItem[] = []
  const raws = text.split('\n')
  for (let i = 0; i < raws.length; i += 1) {
    const raw = raws[i].trim()
    if (raw === '') continue
    const parts = raw.split(',')
    if (parts.length !== 3) {
      throw new Error(`第 ${i + 1} 行格式错误，应为"品名,数量,单价"（用英文逗号分隔）`)
    }
    const name = parts[0].trim()
    const quantity = Number(parts[1].trim())
    const price = Number(parts[2].trim())
    if (name === '') throw new Error(`第 ${i + 1} 行品名不能为空`)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`第 ${i + 1} 行数量必须是大于 0 的数字`)
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`第 ${i + 1} 行单价必须是不小于 0 的数字`)
    }
    items.push({ name, quantity, price, amount: round2(quantity * price) })
  }
  if (items.length === 0) throw new Error('请至少填写一行明细')
  return items
}

/** 组装收据数据：校验明细、计算总计 */
export function buildReceiptData(input: ReceiptInput): ReceiptData {
  if (input.text.trim() === '') throw new Error('请填写收据明细（每行"品名,数量,单价"）')
  assertLatin1([input.text, input.merchant, input.date, input.payment].join('\n'))
  const items = parseItems(input.text)
  return {
    merchant: input.merchant.trim(),
    date: input.date.trim(),
    payment: input.payment.trim(),
    items,
    total: round2(items.reduce((sum, item) => sum + item.amount, 0)),
  }
}

/** 明细表品名列宽；超长截断加 ... */
const NAME_WIDTH = 34

function padRow(name: string, qty: string, price: string, amount: string): string {
  const short = name.length > NAME_WIDTH ? name.slice(0, NAME_WIDTH - 3) + '...' : name
  return (
    short.padEnd(NAME_WIDTH, ' ') +
    qty.padStart(8, ' ') +
    price.padStart(12, ' ') +
    amount.padStart(14, ' ')
  )
}

/** 收据版式：居中标题 → 商户/日期/支付方式 → 明细表（等宽对齐）→ 总计 */
export function buildReceiptLines(data: ReceiptData): DocLine[] {
  const lines: DocLine[] = []
  lines.push({
    text: 'RECEIPT',
    size: 20,
    bold: true,
    mono: false,
    indent: 0,
    spaceAfter: 2,
    rule: false,
    align: 'center',
  })
  if (data.merchant !== '') {
    lines.push({
      text: data.merchant,
      size: 13,
      bold: true,
      mono: false,
      indent: 0,
      spaceAfter: 1,
      rule: false,
      align: 'center',
    })
  }
  const metaLine = [data.date, data.payment].filter((part) => part !== '').join('  |  ')
  if (metaLine !== '') {
    lines.push({
      text: metaLine,
      size: 10,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 2,
      rule: false,
      align: 'center',
    })
  }
  lines.push({
    text: '',
    size: 11,
    bold: false,
    mono: false,
    indent: 0,
    spaceAfter: 4,
    rule: true,
    align: 'left',
  })
  lines.push({
    text: padRow('Item', 'Qty', 'Price', 'Amount'),
    size: 10,
    bold: true,
    mono: true,
    indent: 0,
    spaceAfter: 2,
    rule: false,
    align: 'left',
  })
  for (const item of data.items) {
    lines.push({
      text: padRow(
        item.name,
        String(item.quantity),
        formatMoney(item.price),
        formatMoney(item.amount),
      ),
      size: 10,
      bold: false,
      mono: true,
      indent: 0,
      spaceAfter: 1,
      rule: false,
      align: 'left',
    })
  }
  lines.push({
    text: '',
    size: 10,
    bold: false,
    mono: false,
    indent: 0,
    spaceAfter: 2,
    rule: true,
    align: 'left',
  })
  lines.push({
    text: `Total: ${formatMoney(data.total)}`,
    size: 14,
    bold: true,
    mono: false,
    indent: 0,
    spaceAfter: 8,
    rule: false,
    align: 'center',
  })
  lines.push({
    text: 'Thank you!',
    size: 10,
    bold: false,
    mono: false,
    indent: 0,
    spaceAfter: 2,
    rule: false,
    align: 'center',
  })
  return lines
}

/** 纯文本版收据（供复制 / 下载 .txt 用） */
export function toPlainText(data: ReceiptData): string {
  const out: string[] = ['RECEIPT']
  if (data.merchant !== '') out.push(data.merchant)
  if (data.date !== '') out.push(`Date: ${data.date}`)
  if (data.payment !== '') out.push(`Payment: ${data.payment}`)
  out.push('')
  for (const item of data.items) {
    out.push(
      `${item.name} x ${item.quantity} @ ${formatMoney(item.price)} = ${formatMoney(item.amount)}`,
    )
  }
  out.push(`Total: ${formatMoney(data.total)}`)
  return out.join('\n')
}

/** 入口：组装数据 → 排版 → 渲染 */
export async function buildPdf(input: ReceiptInput): Promise<PdfResult> {
  return renderDocLines(buildReceiptLines(buildReceiptData(input)), 54)
}
