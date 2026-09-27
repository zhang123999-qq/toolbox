// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import { BODY_MAX, FOOTER_MAX, SUBTITLE_MAX, TITLE_MAX, inputSchema, optionsSchema } from './schema'
import type { PosterInput, PosterOptions } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class PosterError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'PosterError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：PosterError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof PosterError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** 文件名中的非法字符：导出 PNG 文件名用 */
const FILENAME_BAD_CHARS = /[\\/:*?"<>|\p{C}]/gu
/** 文件名兜底词（ASCII，避免各平台编码问题） */
const FILENAME_FALLBACK = 'untitled'
/** 导出 PNG 文件名前缀 */
const EXPORT_PREFIX = 'poster'

export interface PosterData {
  readonly title: string
  readonly subtitle: string
  readonly body: string
  readonly footer: string
  readonly theme: string
}

/** 字段上限 → i18n 字段名，供 tooLong 组装双语报错 */
const FIELD_RULES: ReadonlyArray<{
  key: keyof PosterInput
  max: number
  label: MessageKey
}> = [
  { key: 'text', max: BODY_MAX, label: 'poster.field.body' },
  { key: 'title', max: TITLE_MAX, label: 'poster.field.title' },
  { key: 'subtitle', max: SUBTITLE_MAX, label: 'poster.field.subtitle' },
  { key: 'footer', max: FOOTER_MAX, label: 'poster.field.footer' },
]

/**
 * 组装海报数据（纯函数）。
 * 全空 → 返回 null（空态）；任一字段超长 → tooLong；
 * 主题不在白名单 → invalidTheme。`themes` 为调用方传入的 4 个主题展示名（双语）。
 */
export function buildPosterData(
  input: PosterInput,
  options: PosterOptions,
  themes: readonly string[],
  t: Translate,
): PosterData | null {
  const values: Record<keyof PosterInput, string> = {
    text: (input.text as string).trim(),
    title: (input.title as string).trim(),
    subtitle: (input.subtitle as string).trim(),
    footer: (input.footer as string).trim(),
  }
  if (Object.values(values).every((value) => value === '')) return null
  for (const rule of FIELD_RULES) {
    if (values[rule.key].length > rule.max) {
      throw new PosterError('poster.error.tooLong', {
        field: t(rule.label),
        max: rule.max,
      })
    }
  }
  // Zod 契约随后做类型兜底
  inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  if (!themes.includes(parsedOptions.theme)) {
    throw new PosterError('poster.error.unknownTheme', { value: parsedOptions.theme })
  }
  return {
    title: values.title,
    subtitle: values.subtitle,
    body: values.text,
    footer: values.footer,
    theme: parsedOptions.theme,
  }
}

/** 海报的纯文本版本（复制 / 下载用），双语由 t 决定 */
export function formatPosterText(data: PosterData, t: Translate): string {
  const lines: string[] = []
  lines.push(`${t('poster.theme')}：${data.theme}`)
  lines.push('')
  if (data.title !== '') lines.push(data.title)
  if (data.subtitle !== '') lines.push(data.subtitle)
  if (data.title !== '' || data.subtitle !== '') lines.push('')
  if (data.body !== '') lines.push(data.body)
  if (data.footer !== '') {
    lines.push('')
    lines.push(data.footer)
  }
  return lines.join('\n')
}

/**
 * T3 模板的 toText 入口：安全包装，任何非法输入都返回 ''（复制 / 下载不抛错）。
 */
export function toPlainText(
  input: PosterInput,
  options: PosterOptions,
  themes: readonly string[],
  t: Translate,
): string {
  try {
    const data = buildPosterData(input, options, themes, t)
    return data ? formatPosterText(data, t) : ''
  } catch {
    return ''
  }
}

/** 导出 PNG 的文件名：`poster-<标题>.png`，无标题/非法字符时兜底 */
export function exportFileName(data: PosterData): string {
  const clean = data.title.replace(FILENAME_BAD_CHARS, '').trim()
  const stem = clean === '' ? FILENAME_FALLBACK : clean
  return `${EXPORT_PREFIX}-${stem}.png`
}
