import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { InvoiceInput } from './schema'

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

/** 发票明细行 */
export interface InvoiceItem {
  readonly name: string
  readonly quantity: number
  readonly price: number
  readonly amount: number
}

/** 发票完整数据（含计算出的合计） */
export interface InvoiceData {
  readonly seller: string
  readonly buyer: string
  readonly number: string
  readonly date: string
  readonly taxRate: number
  readonly notes: string
  readonly items: readonly InvoiceItem[]
  readonly subtotal: number
  readonly tax: number
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
export function parseItems(text: string): InvoiceItem[] {
  const items: InvoiceItem[] = []
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

/** 税率：空表示 0；非法给出中文错误 */
export function parseTaxRate(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  const rate = Number(trimmed)
  if (!Number.isFinite(rate) || rate < 0) throw new Error('税率必须是大于等于 0 的数字')
  return rate
}

/** 组装发票数据：校验明细、计算小计/税额/总计 */
export function buildInvoiceData(input: InvoiceInput): InvoiceData {
  if (input.text.trim() === '') throw new Error('请填写发票明细（每行"品名,数量,单价"）')
  assertLatin1(
    [
      input.text,
      input.seller,
      input.buyer,
      input.number,
      input.date,
      input.taxRate,
      input.notes,
    ].join('\n'),
  )
  const items = parseItems(input.text)
  const taxRate = parseTaxRate(input.taxRate)
  const subtotal = round2(items.reduce((sum, item) => sum + item.amount, 0))
  const tax = round2((subtotal * taxRate) / 100)
  return {
    seller: input.seller.trim(),
    buyer: input.buyer.trim(),
    number: input.number.trim(),
    date: input.date.trim(),
    taxRate,
    notes: input.notes.trim(),
    items,
    subtotal,
    tax,
    total: round2(subtotal + tax),
  }
}

/** 明细表品名列宽；超长截断加 ... */
const NAME_WIDTH = 30

function padRow(name: string, qty: string, price: string, amount: string): string {
  const short = name.length > NAME_WIDTH ? name.slice(0, NAME_WIDTH - 3) + '...' : name
  return (
    short.padEnd(NAME_WIDTH, ' ') +
    qty.padStart(8, ' ') +
    price.padStart(12, ' ') +
    amount.padStart(14, ' ')
  )
}

/** 发票版式：居中大标题 → 抬头 → 明细表（等宽对齐）→ 合计 → 备注 */
export function buildInvoiceLines(data: InvoiceData): DocLine[] {
  const lines: DocLine[] = []
  lines.push({
    text: 'INVOICE',
    size: 22,
    bold: true,
    mono: false,
    indent: 0,
    spaceAfter: 4,
    rule: false,
    align: 'center',
  })
  const metaLine = [data.number, data.date].filter((part) => part !== '').join('  ')
  if (metaLine !== '') {
    lines.push({
      text: metaLine,
      size: 11,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 2,
      rule: false,
      align: 'center',
    })
  }
  if (data.seller !== '') {
    lines.push({
      text: `From: ${data.seller}`,
      size: 11,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 1,
      rule: false,
      align: 'left',
    })
  }
  if (data.buyer !== '') {
    lines.push({
      text: `To: ${data.buyer}`,
      size: 11,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 4,
      rule: false,
      align: 'left',
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
    text: `Subtotal: ${formatMoney(data.subtotal)}`,
    size: 11,
    bold: false,
    mono: false,
    indent: 330,
    spaceAfter: 1,
    rule: false,
    align: 'left',
  })
  lines.push({
    text: `Tax (${data.taxRate}%): ${formatMoney(data.tax)}`,
    size: 11,
    bold: false,
    mono: false,
    indent: 330,
    spaceAfter: 1,
    rule: false,
    align: 'left',
  })
  lines.push({
    text: `Total: ${formatMoney(data.total)}`,
    size: 14,
    bold: true,
    mono: false,
    indent: 330,
    spaceAfter: 8,
    rule: false,
    align: 'left',
  })
  if (data.notes !== '') {
    lines.push({
      text: `Notes: ${data.notes}`,
      size: 10,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 2,
      rule: false,
      align: 'left',
    })
  }
  return lines
}

/** 纯文本版发票（供复制 / 下载 .txt 用） */
export function toPlainText(data: InvoiceData): string {
  const out: string[] = ['INVOICE']
  if (data.number !== '') out.push(`No: ${data.number}`)
  if (data.date !== '') out.push(`Date: ${data.date}`)
  if (data.seller !== '') out.push(`From: ${data.seller}`)
  if (data.buyer !== '') out.push(`To: ${data.buyer}`)
  out.push('')
  for (const item of data.items) {
    out.push(
      `${item.name} x ${item.quantity} @ ${formatMoney(item.price)} = ${formatMoney(item.amount)}`,
    )
  }
  out.push(`Subtotal: ${formatMoney(data.subtotal)}`)
  out.push(`Tax (${data.taxRate}%): ${formatMoney(data.tax)}`)
  out.push(`Total: ${formatMoney(data.total)}`)
  if (data.notes !== '') out.push(`Notes: ${data.notes}`)
  return out.join('\n')
}

/** 入口：组装数据 → 排版 → 渲染 */
export async function buildPdf(input: InvoiceInput): Promise<PdfResult> {
  return renderDocLines(buildInvoiceLines(buildInvoiceData(input)), 54)
}
