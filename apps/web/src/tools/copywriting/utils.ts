/**
 * copywriting —— 文案生成的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 产品描述上限字符数 */
export const MAX_PRODUCT_CHARS = 2000

/** 每次生成的候选条数 */
export const CANDIDATE_COUNT = 5

/** 文案类型 */
export const COPY_TYPES = ['标题', '口号', '详情', '朋友圈'] as const
export type CopyType = (typeof COPY_TYPES)[number]
export const DEFAULT_COPY_TYPE: CopyType = '标题'

/** 语气 */
export const TONES = ['专业', '活泼', '幽默', '正式', '亲切'] as const
export type Tone = (typeof TONES)[number]
export const DEFAULT_TONE: Tone = '专业'

/** BYOK 配置 */
export interface CopywritingConfig {
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

/** 校验产品描述非空且不超长 */
export function validateProduct(product: string): string {
  const text = product.trim()
  if (text === '') throw new Error('产品描述不能为空')
  if (text.length > MAX_PRODUCT_CHARS) {
    throw new Error(`产品描述过长：${text.length} 字符，超过 ${MAX_PRODUCT_CHARS} 上限`)
  }
  return text
}

/** 校验文案类型在候选列表内 */
export function validateCopyType(copyType: string): CopyType {
  if ((COPY_TYPES as readonly string[]).includes(copyType)) return copyType as CopyType
  throw new Error(`不支持的文案类型：${copyType}`)
}

/** 校验语气在候选列表内 */
export function validateTone(tone: string): Tone {
  if ((TONES as readonly string[]).includes(tone)) return tone as Tone
  throw new Error(`不支持的语气：${tone}`)
}

/** 构造请模型生成文案的提示词：要求每条一行 */
export function buildCopyPrompt(product: string, copyType: CopyType, tone: Tone): string {
  return [
    `请为下面的产品写 ${CANDIDATE_COUNT} 条「${copyType}」文案，语气${tone}。`,
    '要求：每条文案占一行，不要编号、不要解释、不要代码块；',
    '文案用中文，简洁有吸引力，符合对应文案类型的篇幅习惯。',
    '---',
    product,
  ].join('\n')
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  product: string,
  copyType: CopyType,
  tone: Tone,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildCopyPrompt(product, copyType, tone) }],
    temperature: 0.8,
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

/** 生成可复制 / 下载的报告 */
export function buildReport(
  product: string,
  copyType: CopyType,
  tone: Tone,
  model: string,
  copies: readonly string[],
): string {
  return [
    '## 文案生成',
    '',
    `产品：${product}`,
    `类型：${copyType}`,
    `语气：${tone}`,
    `模型：${model}`,
    '',
    ...copies.map((c, i) => `${i + 1}. ${c}`),
  ].join('\n')
}
