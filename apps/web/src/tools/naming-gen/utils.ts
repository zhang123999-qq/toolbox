/**
 * naming-gen —— 命名生成的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 描述上限字符数 */
export const MAX_DESC_CHARS = 500

/** 支持的命名风格 */
export const STYLES = ['camelCase', 'snake_case', 'PascalCase', 'kebab-case'] as const
export type NamingStyle = (typeof STYLES)[number]
export const DEFAULT_STYLE: NamingStyle = 'camelCase'

/** BYOK 配置 */
export interface NamingGenConfig {
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

/** 校验描述非空且不超长 */
export function validateDescription(desc: string): string {
  const text = desc.trim()
  if (text === '') throw new Error('描述不能为空')
  if (text.length > MAX_DESC_CHARS) {
    throw new Error(`描述过长：${text.length} 字符，超过 ${MAX_DESC_CHARS} 上限`)
  }
  return text
}

/** 校验命名风格在候选列表内 */
export function validateStyle(style: string): NamingStyle {
  if ((STYLES as readonly string[]).includes(style)) return style as NamingStyle
  throw new Error(`不支持的命名风格：${style}`)
}

/** 构造请模型生成命名的提示词：要求每行一个候选名 */
export function buildNamingPrompt(desc: string, style: NamingStyle): string {
  return [
    `请为下面描述的变量/函数生成 5 个英文命名候选，使用 ${style} 风格。`,
    '要求：每行只写一个候选名，不要编号、不要解释、不要代码块；',
    '命名应简洁达意，符合英语习惯。',
    '---',
    desc,
  ].join('\n')
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  desc: string,
  style: NamingStyle,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildNamingPrompt(desc, style) }],
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

const capitalize = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1)

/** 风格 → 转换函数（纯函数，供本地校验/转换用） */
const STYLE_FNS: Record<NamingStyle, (words: readonly string[]) => string> = {
  camelCase: (ws) => ws[0] + ws.slice(1).map(capitalize).join(''),
  snake_case: (ws) => ws.join('_'),
  PascalCase: (ws) => ws.map(capitalize).join(''),
  'kebab-case': (ws) => ws.join('-'),
}

/**
 * 把单词数组转成指定命名风格（纯函数）。
 * 单词会被 trim + 转小写；无有效单词抛中文错。
 */
export function toNamingStyle(words: readonly string[], style: NamingStyle): string {
  const clean = words.map((w) => w.trim().toLowerCase()).filter((w) => w !== '')
  if (clean.length === 0) throw new Error('没有可用的单词')
  return STYLE_FNS[style](clean)
}

/** 生成可复制 / 下载的报告 */
export function buildReport(
  desc: string,
  style: NamingStyle,
  model: string,
  names: readonly string[],
): string {
  return [
    '## 命名生成',
    '',
    `描述：${desc}`,
    `风格：${style}`,
    `模型：${model}`,
    '',
    ...names.map((n, i) => `${i + 1}. ${n}`),
  ].join('\n')
}
