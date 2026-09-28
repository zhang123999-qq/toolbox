/**
 * ai-summarize —— 文本摘要（BYOK）的纯函数层
 *
 * BYOK（Bring Your Own Key）模式：
 * - 用户在界面输入自己的 API Key，经 localStorage 持久化（可一键清除）；
 * - 默认服务地址 https://api.openai.com/v1 与默认模型 gpt-4o-mini 只是可改的默认值，
 *   不是硬编码密钥；
 * - 本文件只做纯计算：配置校验、请求体拼装、响应解析、错误文案映射，
 *   真正的 fetch 调用在 Tool.tsx；不触碰浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 默认服务地址（可改，仅是默认值） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
/** 默认模型（可改，仅是默认值） */
export const DEFAULT_MODEL = 'gpt-4o-mini'
/** 请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000
/** 输入文本上限（字符数），超长自动截断 */
export const MAX_INPUT_CHARS = 20_000
/** localStorage 键前缀 */
export const STORAGE_KEY_PREFIX = 'toolbox:ai-summarize'

/** BYOK 可配置字段 */
export type ByokField = 'apiKey' | 'baseUrl' | 'model'

/** localStorage 键：toolbox:ai-summarize:<field> */
export function storageKey(field: ByokField): string {
  return `${STORAGE_KEY_PREFIX}:${field}`
}

// ---------------------------------------------------------------------------
// 摘要长度选项
// ---------------------------------------------------------------------------

/** 摘要长度定义 */
export interface SummaryLengthDef {
  readonly id: string
  readonly label: string
  readonly hint: string
  readonly systemPrompt: string
}

export const SUMMARY_LENGTHS: readonly SummaryLengthDef[] = [
  {
    id: 'brief',
    label: '一句话',
    hint: '一句话概括核心内容',
    systemPrompt:
      '你是一个文本摘要助手。请用一句话概括用户提供的文本的核心内容，直接输出摘要，不要添加解释或前后缀。',
  },
  {
    id: 'standard',
    label: '标准摘要',
    hint: '3～5 句话，要点清晰',
    systemPrompt:
      '你是一个文本摘要助手。请用 3～5 句话总结用户提供的文本，抓住核心观点与关键信息，语言简洁，直接输出摘要，不要添加解释或前后缀。',
  },
  {
    id: 'detailed',
    label: '详细摘要',
    hint: '分点详述，保留关键细节',
    systemPrompt:
      '你是一个文本摘要助手。请对用户提供的文本做详细摘要：分点列出主要内容，保留关键数据、结论与细节，直接输出摘要，不要添加解释或前后缀。',
  },
]

/** 取摘要长度定义；未知 id 抛中文错 */
export function getSummaryLength(id: string): SummaryLengthDef {
  const found = SUMMARY_LENGTHS.find((s) => s.id === id)
  if (!found) throw new Error(`未知的摘要长度："${id}"`)
  return found
}

// ---------------------------------------------------------------------------
// BYOK 配置校验与请求拼装（纯函数）
// ---------------------------------------------------------------------------

/**
 * 归一化服务地址：去首尾空格与末尾斜杠；空字符串回退到默认值；
 * 非 http(s) 开头抛中文错。
 */
export function normalizeBaseUrl(raw: string): string {
  const text = raw.trim().replace(/\/+$/, '')
  if (text === '') return DEFAULT_BASE_URL
  if (!/^https?:\/\//i.test(text)) {
    throw new Error(`服务地址非法："${raw}"（须以 http:// 或 https:// 开头）`)
  }
  return text
}

/** 拼接 chat completions 地址 */
export function buildChatUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`
}

/** API Key 为空抛中文错（调用前置校验） */
export function assertApiKey(key: string): void {
  if (key.trim() === '') throw new Error('请先填写 API Key（下方「服务配置」区）')
}

/**
 * 超长输入截断：返回截断后的文本与是否被截断。
 * maxChars 须为正整数。
 */
export function truncateInput(
  text: string,
  maxChars: number = MAX_INPUT_CHARS,
): { readonly text: string; readonly truncated: boolean } {
  if (!Number.isInteger(maxChars) || maxChars <= 0) {
    throw new Error(`截断长度非法：${String(maxChars)}（应为正整数）`)
  }
  if (text.length <= maxChars) return { text, truncated: false }
  return { text: text.slice(0, maxChars), truncated: true }
}

/** chat 请求消息 */
export interface ChatMessage {
  readonly role: 'system' | 'user'
  readonly content: string
}

/** chat 请求体 */
export interface ChatRequestBody {
  readonly model: string
  readonly messages: readonly ChatMessage[]
  readonly temperature: number
  readonly max_tokens: number
}

/**
 * 拼装摘要请求体（纯函数，可单测）。
 * 文本为空 / 模型名为空抛中文错；超长文本自动截断并在 system prompt 备注。
 */
export function buildSummarizeBody(text: string, model: string, lengthId: string): ChatRequestBody {
  if (text.trim() === '') throw new Error('请输入要摘要的文本')
  if (model.trim() === '') throw new Error('模型名不能为空')
  const length = getSummaryLength(lengthId)
  const { text: body, truncated } = truncateInput(text)
  const system = truncated
    ? `${length.systemPrompt}（注：原文过长，已截取前 ${MAX_INPUT_CHARS} 字符）`
    : length.systemPrompt
  return {
    model: model.trim(),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: body },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  }
}

// ---------------------------------------------------------------------------
// 响应解析与错误文案（纯函数）
// ---------------------------------------------------------------------------

/**
 * 从 chat completions 响应中提取正文。
 * 结构异常抛中文错（不在这里抛原始 JSON，避免把未知结构打进日志）。
 */
export function extractReplyText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('模型返回格式异常：响应不是合法的 JSON 对象')
  }
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('模型返回格式异常：缺少 choices 字段')
  }
  const first = choices[0]
  if (typeof first !== 'object' || first === null) {
    throw new Error('模型返回格式异常：choices[0] 不是对象')
  }
  const content = (first as { message?: { content?: unknown } }).message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('模型返回了空内容，请重试')
  }
  return content
}

/** HTTP 状态码 → 中文错误提示 */
export function httpStatusMessage(status: number): string {
  if (status === 401) return 'API Key 无效或已过期（401），请检查后重试'
  if (status === 403) return '无权访问该模型（403），请检查 Key 权限或更换模型'
  if (status === 429) return '请求过于频繁或配额不足（429），请稍后再试'
  if (status === 500 || status === 502 || status === 503) {
    return `模型服务暂时不可用（${status}），请稍后再试`
  }
  return `请求失败（HTTP ${status}），请检查服务地址与网络后重试`
}

/** 网络层异常 → 中文错误提示（不回显 Key 相关信息） */
export function networkErrorMessage(err: unknown): string {
  // 超时由 AbortController 触发：按 name 做鸭子类型判断，不依赖 DOMException
  if (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'AbortError'
  ) {
    return `请求超时（${REQUEST_TIMEOUT_MS / 1000} 秒），请检查网络后重试`
  }
  if (err instanceof TypeError) {
    return '网络连接失败：无法访问服务地址，请检查网络与服务地址是否正确'
  }
  if (err instanceof Error) return `请求失败：${err.message}`
  return '请求失败，请重试'
}
