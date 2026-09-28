/**
 * code-explain —— 代码解释的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 代码上限字符数 */
export const MAX_CODE_CHARS = 20_000

/** 支持的语言候选 */
export const LANGUAGES = [
  'auto',
  'python',
  'javascript',
  'typescript',
  'java',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'bash',
  'sql',
  'html',
  'css',
  'php',
  'ruby',
  'kotlin',
  'swift',
] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'auto'

/** 语言 → 中文显示名 */
export function languageLabel(lang: Language): string {
  if (lang === 'auto') return '自动识别'
  return lang
}

/** BYOK 配置 */
export interface CodeExplainConfig {
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

/** 校验代码非空且不超长 */
export function validateCode(code: string): string {
  const text = code.trim()
  if (text === '') throw new Error('代码不能为空')
  if (text.length > MAX_CODE_CHARS) {
    throw new Error(`代码过长：${text.length} 字符，超过 ${MAX_CODE_CHARS} 上限`)
  }
  return text
}

/** 校验语言在候选列表内 */
export function validateLanguage(lang: string): Language {
  if ((LANGUAGES as readonly string[]).includes(lang)) return lang as Language
  throw new Error(`不支持的语言：${lang}`)
}

/** 构造请模型解释代码的提示词：要求中文、结构化输出 */
export function buildExplainPrompt(code: string, language: Language): string {
  const langHint = language === 'auto' ? '请先识别代码的语言' : `这是一段 ${language} 代码`
  return [
    `${langHint}，请用中文解释它，按以下结构输出：`,
    '1. 功能概述：一句话说明这段代码是做什么的；',
    '2. 关键逻辑：分步骤解释核心流程，指出关键函数/变量的作用；',
    '3. 注意事项：潜在的 bug、边界情况或可改进之处（如有）。',
    '---',
    code,
  ].join('\n')
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  code: string,
  language: Language,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildExplainPrompt(code, language) }],
    temperature: 0.3,
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

/** 生成可复制 / 下载的解释报告 */
export function buildReport(
  code: string,
  language: Language,
  model: string,
  explanation: string,
): string {
  return [
    '## 代码解释',
    '',
    `语言：${languageLabel(language)}`,
    `模型：${model}`,
    '',
    '### 代码',
    '```',
    code,
    '```',
    '',
    '### 解释',
    explanation,
  ].join('\n')
}
