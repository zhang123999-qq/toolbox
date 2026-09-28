/**
 * prompt-optimize —— 提示词优化的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch / localStorage / AbortController 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 默认模型 */
export const DEFAULT_MODEL = 'gpt-4o-mini'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 待优化提示词上限字符数：防止把整本小说贴进来 */
export const MAX_PROMPT_CHARS = 20_000

/** 优化指令：要求模型输出结构化提示词（任务 / 背景 / 约束 / 输出格式） */
export function buildSystemPrompt(): string {
  return [
    '你是一名提示词工程专家。用户会给你一段粗糙的提示词，',
    '请把它改写为结构化的高质量提示词，必须包含以下四个部分：',
    '1. （任务）一句话说清要模型做什么；',
    '2. （背景）完成任务需要的上下文信息（若原文缺失请合理补全并标注）；',
    '3. （约束）明确的限制条件（如语言、篇幅、风格、禁止事项）；',
    '4. （输出格式）期望的输出结构（分点、表格、JSON 等）。',
    '只输出改写后的提示词正文，不要加解释、前言或多余寒暄。',
    '保持与用户原文相同的语言。',
  ].join('')
}

/** 组装发给模型的用户消息；空文本 / 超长文本抛中文错 */
export function buildUserPrompt(raw: string): string {
  const text = raw.trim()
  if (text === '') throw new Error('待优化的提示词不能为空')
  if (text.length > MAX_PROMPT_CHARS) {
    throw new Error(`提示词过长：${text.length} 字符，超过 ${MAX_PROMPT_CHARS} 上限`)
  }
  return `请优化以下提示词：\n\n${text}`
}

/**
 * 拼出 chat/completions 地址：去掉 baseURL 末尾多余的斜杠。
 * baseURL 为空或非字符串时抛中文错。
 */
export function chatCompletionsUrl(baseURL: string): string {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('接口地址不能为空')
  }
  return `${baseURL.trim().replace(/\/+$/, '')}/chat/completions`
}

/** OpenAI-compatible 请求体 */
export interface ChatRequestBody {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
}

export function buildRequestBody(model: string, system: string, user: string): ChatRequestBody {
  return {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.7,
  }
}

interface ChatMessageLike {
  readonly content?: unknown
}
interface ChatChoiceLike {
  readonly message?: ChatMessageLike
}
interface ChatResponseLike {
  readonly choices?: readonly ChatChoiceLike[]
}

/** 从 chat/completions 响应 JSON 中取出助手文本；结构异常时抛中文错 */
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

/** 优化前后对比报告（供复制 / 下载） */
export function formatComparison(raw: string, optimized: string): string {
  return ['## 原始提示词', raw.trim(), '', '## 优化后提示词', optimized.trim()].join('\n')
}
