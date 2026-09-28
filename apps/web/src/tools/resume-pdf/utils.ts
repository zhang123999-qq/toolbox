import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { ResumeInput } from './schema'

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

/** 工作经历条目 */
export interface ExperienceItem {
  readonly company: string
  readonly role: string
  readonly period: string
  readonly detail: string
}

/** 简历完整数据 */
export interface ResumeData {
  readonly name: string
  readonly title: string
  readonly email: string
  readonly phone: string
  readonly location: string
  readonly summary: string
  readonly experience: readonly ExperienceItem[]
  readonly education: string
  readonly skills: string
}

/**
 * 解析工作经历：每行"公司 | 职位 | 时间段 | 描述"（英文竖线分隔，描述可空）。
 * 空行跳过；格式非法时报错并带行号。
 */
export function parseExperience(text: string): ExperienceItem[] {
  const items: ExperienceItem[] = []
  const raws = text.split('\n')
  for (let i = 0; i < raws.length; i += 1) {
    const raw = raws[i].trim()
    if (raw === '') continue
    const parts = raw.split('|')
    if (parts.length < 3 || parts.length > 4) {
      throw new Error(`第 ${i + 1} 行格式错误，应为"公司 | 职位 | 时间段 | 描述"（用英文竖线分隔）`)
    }
    const company = parts[0].trim()
    const role = parts[1].trim()
    const period = parts[2].trim()
    const detail = (parts[3] ?? '').trim()
    if (company === '' || role === '' || period === '') {
      throw new Error(`第 ${i + 1} 行公司、职位、时间段均不能为空`)
    }
    items.push({ company, role, period, detail })
  }
  return items
}

/** 组装简历数据：姓名必填，其余可选 */
export function buildResumeData(input: ResumeInput): ResumeData {
  if (input.name.trim() === '') throw new Error('请填写姓名')
  assertLatin1(
    [
      input.name,
      input.title,
      input.email,
      input.phone,
      input.location,
      input.summary,
      input.experience,
      input.education,
      input.skills,
    ].join('\n'),
  )
  return {
    name: input.name.trim(),
    title: input.title.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    location: input.location.trim(),
    summary: input.summary.trim(),
    experience: parseExperience(input.experience),
    education: input.education.trim(),
    skills: input.skills.trim(),
  }
}

/** 章节标题：加粗 + 下方分割线 */
function sectionHeader(lines: DocLine[], title: string): void {
  lines.push({
    text: title,
    size: 12,
    bold: true,
    mono: false,
    indent: 0,
    spaceAfter: 2,
    rule: false,
    align: 'left',
  })
  lines.push({
    text: '',
    size: 12,
    bold: false,
    mono: false,
    indent: 0,
    spaceAfter: 4,
    rule: true,
    align: 'left',
  })
}

/** 多行文本（简介/教育）：按换行拆行，空行转段间距 */
function pushParagraph(lines: DocLine[], text: string, size: number): void {
  for (const raw of text.split('\n')) {
    const trimmed = raw.trim()
    if (trimmed === '') continue
    lines.push({
      text: trimmed,
      size,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 2,
      rule: false,
      align: 'left',
    })
  }
}

/** 简历版式：姓名居中大标题 → 联系行 → 各章节 */
export function buildResumeLines(data: ResumeData): DocLine[] {
  const lines: DocLine[] = []
  lines.push({
    text: data.name,
    size: 24,
    bold: true,
    mono: false,
    indent: 0,
    spaceAfter: 2,
    rule: false,
    align: 'center',
  })
  if (data.title !== '') {
    lines.push({
      text: data.title,
      size: 13,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 2,
      rule: false,
      align: 'center',
    })
  }
  const contact = [data.email, data.phone, data.location]
    .filter((part) => part !== '')
    .join('  |  ')
  if (contact !== '') {
    lines.push({
      text: contact,
      size: 10,
      bold: false,
      mono: false,
      indent: 0,
      spaceAfter: 6,
      rule: false,
      align: 'center',
    })
  }
  if (data.summary !== '') {
    sectionHeader(lines, 'Summary')
    pushParagraph(lines, data.summary, 10.5)
  }
  if (data.experience.length > 0) {
    sectionHeader(lines, 'Experience')
    for (const item of data.experience) {
      lines.push({
        text: `${item.role} @ ${item.company}`,
        size: 11,
        bold: true,
        mono: false,
        indent: 0,
        spaceAfter: 0,
        rule: false,
        align: 'left',
      })
      lines.push({
        text: item.period,
        size: 9.5,
        bold: false,
        mono: false,
        indent: 0,
        spaceAfter: 1,
        rule: false,
        align: 'left',
      })
      if (item.detail !== '') {
        lines.push({
          text: `- ${item.detail}`,
          size: 10.5,
          bold: false,
          mono: false,
          indent: 12,
          spaceAfter: 4,
          rule: false,
          align: 'left',
        })
      } else {
        lines.push({
          text: '',
          size: 10.5,
          bold: false,
          mono: false,
          indent: 0,
          spaceAfter: 4,
          rule: false,
          align: 'left',
        })
      }
    }
  }
  if (data.education !== '') {
    sectionHeader(lines, 'Education')
    pushParagraph(lines, data.education, 10.5)
  }
  if (data.skills !== '') {
    sectionHeader(lines, 'Skills')
    pushParagraph(lines, data.skills, 10.5)
  }
  return lines
}

/** 纯文本版简历（供复制 / 下载 .txt 用） */
export function toPlainText(data: ResumeData): string {
  const out: string[] = [data.name]
  if (data.title !== '') out.push(data.title)
  const contact = [data.email, data.phone, data.location].filter((part) => part !== '').join(' | ')
  if (contact !== '') out.push(contact)
  if (data.summary !== '') out.push('', 'Summary', data.summary)
  if (data.experience.length > 0) {
    out.push('', 'Experience')
    for (const item of data.experience) {
      out.push(`${item.role} @ ${item.company} (${item.period})`)
      if (item.detail !== '') out.push(`- ${item.detail}`)
    }
  }
  if (data.education !== '') out.push('', 'Education', data.education)
  if (data.skills !== '') out.push('', 'Skills', data.skills)
  return out.join('\n')
}

/** 入口：组装数据 → 排版 → 渲染 */
export async function buildPdf(input: ResumeInput): Promise<PdfResult> {
  return renderDocLines(buildResumeLines(buildResumeData(input)), 54)
}
