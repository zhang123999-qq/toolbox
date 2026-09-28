/**
 * email-gen —— 邮件生成的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 写信目的上限字符数 */
export const MAX_PURPOSE_CHARS = 2000

/** 收件人上限字符数 */
export const MAX_RECIPIENT_CHARS = 200

/** 语气 */
export const TONES = ['正式', '亲切', '简洁', '恳切'] as const
export type Tone = (typeof TONES)[number]
export const DEFAULT_TONE: Tone = '正式'

/** 语言 */
export const EMAIL_LANGUAGES = ['中文', '英文'] as const
export type EmailLanguage = (typeof EMAIL_LANGUAGES)[number]
export const DEFAULT_EMAIL_LANGUAGE: EmailLanguage = '中文'

/** BYOK 配置 */
export interface EmailGenConfig {
  readonly baseURL: string
  readonly model: string
  readonly apiKey: string
}

/** 拼出 chat/completions 地址 */
export function chatCompletionsUrl(baseURL: string): string {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('接口地址不能为空')
  }
  return `${baseURL.trim().replace(/\/+$/, '')}/chat/completions`
}

/** 校验收件人非空且不超长 */
export function validateRecipient(recipient: string): string {
  const text = recipient.trim()
  if (text === '') throw new Error('收件人不能为空')
  if (text.length > MAX_RECIPIENT_CHARS) {
    throw new Error(`收件人过长：${text.length} 字符，超过 ${MAX_RECIPIENT_CHARS} 上限`)
  }
  return text
}

/** 校验写信目的非空且不超长 */
export function validatePurpose(purpose: string): string {
  const text = purpose.trim()
  if (text === '') throw new Error('写信目的不能为空')
  if (text.length > MAX_PURPOSE_CHARS) {
    throw new Error(`写信目的过长：${text.length} 字符，超过 ${MAX_PURPOSE_CHARS} 上限`)
  }
  return text
}

/** 校验语气在候选列表内 */
export function validateTone(tone: string): Tone {
  if ((TONES as readonly string[]).includes(tone)) return tone as Tone
  throw new Error(`不支持的语气：${tone}`)
}

/** 校验语言在候选列表内 */
export function validateEmailLanguage(lang: string): EmailLanguage {
  if ((EMAIL_LANGUAGES as readonly string[]).includes(lang)) return lang as EmailLanguage
  throw new Error(`不支持的语言：${lang}`)
}

/** 构造请模型生成邮件的提示词：要求主题+正文结构化输出 */
export function buildEmailPrompt(
  recipient: string,
  purpose: string,
  tone: Tone,
  language: EmailLanguage,
): string {
  return [
    `请用${language}写一封${tone}的邮件。`,
    `收件人：${recipient}`,
    `写信目的：${purpose}`,
    '输出格式要求：第一行以「主题：」开头写邮件主题，空一行后写正文；',
    '不要输出多余文字。',
  ].join('\n')
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  recipient: string,
  purpose: string,
  tone: Tone,
  language: EmailLanguage,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildEmailPrompt(recipient, purpose, tone, language) }],
    temperature: 0.7,
  }
}

interface ChatResponseLike {
  readonly choices?: readonly { readonly message?: { readonly content?: unknown } }[]
}

/** 从响应 JSON 取出助手文本；结构异常抛中文错 */
export function extractAssistantText(data: unknown): string {
  const choices = (data as ChatResponseLike | null | undefined)?.choices
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('接口返回异常：缺少 choices 字段')
  }
  const content = choices[0]?.message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('接口返回异常：助手的回复内容为空')
  }
  return content.trim()
}

/** HTTP 错误码 → 中文提示 */
export function parseHttpError(status: number, bodyText: string): string {
  const hint = bodyText.trim().slice(0, 200)
  const suffix = hint === '' ? '' : `（${hint}）`
  if (status === 401) return `认证失败：API Key 无效或已过期${suffix}`
  if (status === 403) return `无权限：该 Key 无权访问此模型或接口${suffix}`
  if (status === 404) return `接口不存在：请检查 baseURL 或模型名${suffix}`
  if (status === 429) return `请求过于频繁或配额不足，请稍后重试${suffix}`
  if (status >= 500) return `服务端错误（${status}），请稍后重试${suffix}`
  return `请求失败（HTTP ${status}）${suffix}`
}

/** 把 LLM 返回按条拆分：去编号/符号/反引号/空行 */
export function parseListOutput(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^(\d+[.)、]|[-*•])\s*/, ''))
    .map((line) => line.replace(/^`+|`+$/g, '').trim())
    .filter((line) => line !== '')
}

/** 解析出的邮件 */
export interface EmailOutput {
  readonly subject: string
  readonly body: string
}

/**
 * 从 LLM 返回中解析主题与正文：
 * 首行须以「主题：」开头，其余为正文；缺主题或正文为空抛中文错。
 */
export function parseEmailOutput(text: string): EmailOutput {
  const lines = text.trim().split('\n')
  const first = lines[0].trim()
  const m = /^主题[:：]\s*(.+)$/.exec(first)
  if (!m) throw new Error('接口返回异常：未找到邮件主题')
  const body = lines.slice(1).join('\n').trim()
  if (body === '') throw new Error('接口返回异常：邮件正文为空')
  return { subject: m[1].trim(), body }
}

/** 生成可复制 / 下载的邮件 */
export function buildReport(
  recipient: string,
  purpose: string,
  tone: Tone,
  language: EmailLanguage,
  model: string,
  email: EmailOutput,
): string {
  return [
    `收件人：${recipient}`,
    `写信目的：${purpose}`,
    `语气：${tone}`,
    `语言：${language}`,
    `模型：${model}`,
    '',
    `主题：${email.subject}`,
    '',
    email.body,
  ].join('\n')
}
