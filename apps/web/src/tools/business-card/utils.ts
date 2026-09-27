// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import {
  COMPANY_MAX,
  EMAIL_MAX,
  NAME_MAX,
  PHONE_MAX,
  TITLE_MAX,
  WEBSITE_MAX,
  inputSchema,
} from './schema'
import type { BusinessCardInput } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class BusinessCardError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'BusinessCardError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：BusinessCardError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof BusinessCardError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** XML 转义：& 必须先转义，其余依次处理 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 名片卡面标准尺寸（像素，85.6:53.98 的近似比例） */
const CARD_WIDTH = 340
const CARD_HEIGHT = 200
/** 纸面圆角 */
const CARD_RADIUS = 8
/** 左侧装饰条宽度 */
const ACCENT_WIDTH = 6
/** 文本起始 x */
const TEXT_X = 28
/** 各行 y 坐标（字段为空时整行跳过） */
const Y_NAME = 52
const Y_TITLE = 76
const Y_COMPANY = 98
const Y_CONTACT_START = 136
const Y_CONTACT_STEP = 18

/** 卡面背景：深蓝渐变（内联定义，无外部图片/字体） */
const CARD_GRADIENT = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e3a5f"/>
      <stop offset="1" stop-color="#0f2027"/>
    </linearGradient>
  </defs>`

export interface BusinessCardData {
  readonly name: string
  readonly title: string
  readonly company: string
  readonly phone: string
  readonly email: string
  readonly website: string
}

/** 字段上限 → i18n 字段名，供 tooLong 组装双语报错 */
const FIELD_RULES: ReadonlyArray<{
  key: keyof BusinessCardInput
  max: number
  label: MessageKey
}> = [
  { key: 'text', max: NAME_MAX, label: 'businessCard.field.name' },
  { key: 'title', max: TITLE_MAX, label: 'businessCard.field.title' },
  { key: 'company', max: COMPANY_MAX, label: 'businessCard.field.company' },
  { key: 'phone', max: PHONE_MAX, label: 'businessCard.field.phone' },
  { key: 'email', max: EMAIL_MAX, label: 'businessCard.field.email' },
  { key: 'website', max: WEBSITE_MAX, label: 'businessCard.field.website' },
]

/**
 * 组装名片数据（纯函数）。
 * 全空 → 返回 null（空态）；姓名为空但填了其他字段 → emptyName；
 * 任一字段超长 → tooLong（双语）。
 */
export function buildBusinessCardData(
  input: BusinessCardInput,
  t: Translate,
): BusinessCardData | null {
  const values: Record<keyof BusinessCardInput, string> = {
    text: (input.text as string).trim(),
    title: (input.title as string).trim(),
    company: (input.company as string).trim(),
    phone: (input.phone as string).trim(),
    email: (input.email as string).trim(),
    website: (input.website as string).trim(),
  }
  if (Object.values(values).every((value) => value === '')) return null
  if (values.text === '') throw new BusinessCardError('businessCard.error.emptyName')
  for (const rule of FIELD_RULES) {
    if (values[rule.key].length > rule.max) {
      throw new BusinessCardError('businessCard.error.tooLong', {
        field: t(rule.label),
        max: rule.max,
      })
    }
  }
  // Zod 契约随后做类型兜底
  inputSchema.parse(input)
  return {
    name: values.text,
    title: values.title,
    company: values.company,
    phone: values.phone,
    email: values.email,
    website: values.website,
  }
}

function textLine(x: number, y: number, content: string, attrs: string): string {
  return `  <text x="${x}" y="${y}" ${attrs}>${escapeXml(content)}</text>`
}

/**
 * 渲染完整的 SVG 名片（纯字符串拼接，无外部资源）。
 * 输出为独立 .svg 文件内容，可用浏览器打开、打印或转为 PNG。
 */
export function renderBusinessCardSvg(data: BusinessCardData, hint: string): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${escapeXml(hint)} -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">`,
    CARD_GRADIENT,
    `  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CARD_RADIUS}" fill="url(#bg)"/>`,
    `  <rect x="0" y="0" width="${ACCENT_WIDTH}" height="${CARD_HEIGHT}" fill="#f59e0b"/>`,
    textLine(
      TEXT_X,
      Y_NAME,
      data.name,
      'font-family="-apple-system, \'PingFang SC\', \'Microsoft YaHei\', sans-serif" font-size="26" font-weight="bold" fill="#ffffff"',
    ),
  ]
  if (data.title !== '') {
    lines.push(textLine(TEXT_X, Y_TITLE, data.title, 'font-size="13" fill="#fbbf24"'))
  }
  if (data.company !== '') {
    lines.push(textLine(TEXT_X, Y_COMPANY, data.company, 'font-size="12" fill="#cbd5e1"'))
  }
  const contacts = [data.phone, data.email, data.website]
  contacts.forEach((contact, index) => {
    if (contact !== '') {
      lines.push(
        textLine(
          TEXT_X,
          Y_CONTACT_START + index * Y_CONTACT_STEP,
          contact,
          'font-size="11" fill="#e2e8f0"',
        ),
      )
    }
  })
  lines.push('</svg>')
  return lines.join('\n')
}

/**
 * T2 模板的 run 入口：返回 SVG 代码字符串。
 * 全空 → ''（模板显示空态）；非法输入 → 抛出已本地化的 Error。
 */
export function transform(input: BusinessCardInput, t: Translate): string {
  try {
    const data = buildBusinessCardData(input, t)
    if (!data) return ''
    return renderBusinessCardSvg(data, t('businessCard.hint'))
  } catch (error) {
    throw new Error(localizeError(error, t), { cause: error })
  }
}
