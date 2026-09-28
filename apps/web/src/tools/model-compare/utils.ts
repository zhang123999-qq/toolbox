/**
 * model-compare —— 模型对比的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch / localStorage / 计时只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 提示词上限字符数 */
export const MAX_PROMPT_CHARS = 20_000

/** 单侧模型配置 */
export interface ModelSide {
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

/** 校验提示词非空且不超长 */
export function validatePrompt(prompt: string): string {
  const text = prompt.trim()
  if (text === '') throw new Error('对比的提示词不能为空')
  if (text.length > MAX_PROMPT_CHARS) {
    throw new Error(`提示词过长：${text.length} 字符，超过 ${MAX_PROMPT_CHARS} 上限`)
  }
  return text
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  prompt: string,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: prompt }],
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

/** 毫秒 → "1.23 秒" */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) throw new Error(`耗时非法：${String(ms)}`)
  return `${(ms / 1000).toFixed(2)} 秒`
}

/** 单侧对比结果 */
export interface SideResult {
  readonly model: string
  readonly output: string
  readonly durationMs: number
  readonly error: string
}

/** 生成可复制 / 下载的对比报告 */
export function buildReport(prompt: string, a: SideResult, b: SideResult): string {
  const side = (name: string, r: SideResult): string[] => [
    `## ${name}：${r.model}`,
    r.error === '' ? `耗时：${formatDurationMs(r.durationMs)}` : `失败：${r.error}`,
    '',
    r.error === '' ? r.output : '（无输出）',
  ]
  return ['## 提示词', prompt, '', ...side('模型 A', a), '', ...side('模型 B', b)].join('\n')
}
