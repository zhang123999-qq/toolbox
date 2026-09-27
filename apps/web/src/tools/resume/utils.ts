// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import {
  EDUCATION_MAX,
  EMAIL_MAX,
  EXPERIENCE_MAX,
  NAME_MAX,
  PHONE_MAX,
  SKILLS_MAX,
  SUMMARY_MAX,
  TITLE_MAX,
  inputSchema,
} from './schema'
import type { ResumeInput } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class ResumeError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'ResumeError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：ResumeError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof ResumeError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** 文件名中的非法字符（Windows / POSIX 通用 + 控制字符）：导出 PNG 文件名用 */
const FILENAME_BAD_CHARS = /[\\/:*?"<>|\p{C}]/gu
/** 文件名兜底词（保持 ASCII，避免各平台编码问题） */
const FILENAME_FALLBACK = 'untitled'
/** 导出 PNG 文件名前缀 */
const EXPORT_PREFIX = 'resume'

export interface ResumeData {
  readonly name: string
  readonly title: string
  readonly phone: string
  readonly email: string
  readonly summary: string
  readonly experience: string
  readonly education: string
  readonly skills: string
}

type ResumeField = keyof ResumeData

/** 字段 → 长度上限 → 字段名 i18n key（超长报错时翻译字段名） */
const FIELD_LIMITS: ReadonlyArray<{
  readonly key: ResumeField
  readonly max: number
  readonly label: MessageKey
}> = [
  { key: 'name', max: NAME_MAX, label: 'resume.field.name' },
  { key: 'title', max: TITLE_MAX, label: 'resume.field.title' },
  { key: 'phone', max: PHONE_MAX, label: 'resume.field.phone' },
  { key: 'email', max: EMAIL_MAX, label: 'resume.field.email' },
  { key: 'summary', max: SUMMARY_MAX, label: 'resume.field.summary' },
  { key: 'experience', max: EXPERIENCE_MAX, label: 'resume.field.experience' },
  { key: 'education', max: EDUCATION_MAX, label: 'resume.field.education' },
  { key: 'skills', max: SKILLS_MAX, label: 'resume.field.skills' },
]

/** 输入字段名 → ResumeData 字段名的映射（text 是模板主输入，语义为姓名） */
const INPUT_TO_FIELD: Readonly<Record<string, ResumeField>> = {
  text: 'name',
  title: 'title',
  phone: 'phone',
  email: 'email',
  summary: 'summary',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
}

function checkLength(value: string, max: number, label: MessageKey, t: Translate): void {
  if (value.length > max) {
    throw new ResumeError('resume.error.tooLong', { field: t(label), max })
  }
}

/**
 * 组装简历数据（纯函数）。
 * 全空 → 返回 null（上层渲染空态，不报错）；
 * 填了内容但姓名为空 → 抛 emptyName；
 * 任一字段超长 → 抛 tooLong（双语字段名）。
 */
export function buildResumeData(input: ResumeInput, t: Translate): ResumeData | null {
  const data = {} as Record<ResumeField, string>
  for (const [inputKey, field] of Object.entries(INPUT_TO_FIELD)) {
    data[field] = (input[inputKey as keyof ResumeInput] as string).trim()
  }
  const allEmpty = Object.values(data).every((value) => value === '')
  if (allEmpty) return null
  if (data.name === '') throw new ResumeError('resume.error.emptyName')
  // 长度校验走双语 keyed 错误（面向用户）；Zod 契约随后做类型兜底
  for (const { key, max, label } of FIELD_LIMITS) {
    checkLength(data[key], max, label, t)
  }
  inputSchema.parse(input)
  return data
}

/** 向纯文本行追加一个「标题 + 正文」段落：正文为空则跳过 */
function appendSection(lines: string[], title: string, body: string): void {
  if (body === '') return
  lines.push(title + '：')
  lines.push(body)
  lines.push('')
}

/** 简历的纯文本版本（复制 / 下载用），双语由 t 决定 */
export function formatResumeText(data: ResumeData, t: Translate): string {
  const lines: string[] = []
  lines.push(data.title === '' ? data.name : `${data.name} · ${data.title}`)
  const contact = [data.phone, data.email].filter((part) => part !== '').join(' / ')
  if (contact !== '') lines.push(`${t('resume.label.contact')}：${contact}`)
  lines.push('')
  appendSection(lines, t('resume.field.summary'), data.summary)
  appendSection(lines, t('resume.field.experience'), data.experience)
  appendSection(lines, t('resume.field.education'), data.education)
  appendSection(lines, t('resume.field.skills'), data.skills)
  return lines.join('\n').trimEnd()
}

/**
 * T3 模板的 toText 入口：安全包装，任何非法输入都返回 ''（复制 / 下载不抛错）。
 */
export function toPlainText(input: ResumeInput, t: Translate): string {
  try {
    const data = buildResumeData(input, t)
    return data ? formatResumeText(data, t) : ''
  } catch {
    return ''
  }
}

/** 导出 PNG 的文件名：`resume-<姓名>.png`，过滤文件名非法字符 */
export function exportFileName(data: ResumeData): string {
  const clean = data.name.replace(FILENAME_BAD_CHARS, '').trim()
  const stem = clean === '' ? FILENAME_FALLBACK : clean
  return `${EXPORT_PREFIX}-${stem}.png`
}
