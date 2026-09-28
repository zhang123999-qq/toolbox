/**
 * regex-gen —— 正则生成的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 * 正则测试（buildTestResult）是纯 JS：new RegExp + matchAll，不经过网络。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 需求描述上限字符数 */
export const MAX_DESC_CHARS = 2000

/** 测试文本上限字符数 */
export const MAX_TEST_CHARS = 5000

/** BYOK 配置 */
export interface RegexGenConfig {
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

/** 校验需求描述非空且不超长 */
export function validateDescription(desc: string): string {
  const text = desc.trim()
  if (text === '') throw new Error('需求描述不能为空')
  if (text.length > MAX_DESC_CHARS) {
    throw new Error(`需求描述过长：${text.length} 字符，超过 ${MAX_DESC_CHARS} 上限`)
  }
  return text
}

/** 校验测试文本不超长（允许为空） */
export function validateTestText(text: string): string {
  if (text.length > MAX_TEST_CHARS) {
    throw new Error(`测试文本过长：${text.length} 字符，超过 ${MAX_TEST_CHARS} 上限`)
  }
  return text
}

/** 构造请模型生成正则的提示词：要求代码块给正则、逐段解释 */
export function buildRegexPrompt(desc: string): string {
  return [
    '请把下面的自然语言需求转换成 JavaScript 正则表达式（不带首尾斜杠、不带 flag）。',
    '输出格式：先给一个 ``` 代码块放正则表达式正文，空一行后逐段解释每个部分的含义。',
    '不要输出多余文字。',
    '---',
    desc,
  ].join('\n')
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  desc: string,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildRegexPrompt(desc) }],
    temperature: 0.2,
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

/**
 * 从 LLM 返回中提取正则正文：
 * 优先取第一个 ``` 代码块的首行；无代码块则取全文首行。
 * 找不到非空内容抛中文错。
 */
export function extractRegexCodeBlock(text: string): string {
  const fenced = /```(?:\w+)?\s*\n?([\s\S]*?)```/.exec(text)
  const candidate = (fenced ? fenced[1] : text).trim().split('\n')[0].trim()
  if (candidate === '') throw new Error('接口返回异常：未找到正则表达式')
  return candidate
}

/** 正则测试结果 */
export interface RegexTestResult {
  readonly pattern: string
  readonly matches: readonly string[]
}

/**
 * 纯 JS 在测试文本上跑匹配（全局匹配）。
 * 正则非法抛中文错；测试文本为空时返回空匹配列表。
 */
export function buildTestResult(pattern: string, testText: string): RegexTestResult {
  let re: RegExp
  try {
    re = new RegExp(pattern, 'g')
  } catch (err) {
    throw new Error(`正则表达式非法：${String(err)}`, { cause: err })
  }
  return { pattern, matches: [...testText.matchAll(re)].map((m) => m[0]) }
}

/** 生成可复制 / 下载的报告 */
export function buildReport(
  desc: string,
  model: string,
  pattern: string,
  explanation: string,
): string {
  return [
    '## 正则生成',
    '',
    `需求：${desc}`,
    `模型：${model}`,
    '',
    '### 正则',
    '```',
    pattern,
    '```',
    '',
    '### 解释',
    explanation,
  ].join('\n')
}
