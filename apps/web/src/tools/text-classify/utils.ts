/**
 * text-classify —— 文本分类的纯函数层
 *
 * BYOK 模式：给定候选类别，请 LLM 返回 JSON {label, confidence}，严格解析。
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 待分类文本上限字符数 */
export const MAX_TEXT_CHARS = 5000

/** 分类结果 */
export interface ClassifyResult {
  readonly label: string
  /** 置信度 0~1 */
  readonly confidence: number
}

/** 拼出 chat/completions 地址 */
export function chatCompletionsUrl(baseURL: string): string {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('接口地址不能为空')
  }
  return `${baseURL.trim().replace(/\/+$/, '')}/chat/completions`
}

/** 校验待分类文本非空且不超长 */
export function validateText(text: string): string {
  const t = text.trim()
  if (t === '') throw new Error('待分类文本不能为空')
  if (t.length > MAX_TEXT_CHARS) {
    throw new Error(`文本过长：${t.length} 字符，超过 ${MAX_TEXT_CHARS} 上限`)
  }
  return t
}

/**
 * 解析候选类别：支持逗号 / 顿号 / 分号 / 换行分隔，去重保序。
 * 为空抛中文错。
 */
export function parseCategories(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[,，、；;；\n]/)) {
    const c = part.trim()
    if (c !== '' && !seen.has(c)) {
      seen.add(c)
      out.push(c)
    }
  }
  if (out.length === 0) throw new Error('候选类别不能为空，请用逗号或换行分隔输入至少一个类别')
  return out
}

/** 构造请模型分类的提示词：要求只输出 JSON */
export function buildClassifyPrompt(text: string, categories: readonly string[]): string {
  return [
    '请把下面的文本归入且仅归入其中一个候选类别。',
    `候选类别：${categories.join('、')}`,
    '只输出 JSON，不要输出其他内容，格式如下：',
    '{"label": "类别名", "confidence": 0.95}',
    '其中 label 必须是候选类别之一，confidence 是 0~1 的置信度。',
    '---',
    text,
  ].join('\n')
}

/** OpenAI-compatible 请求体（temperature 固定 0，保证分类稳定） */
export function buildRequestBody(
  model: string,
  text: string,
  categories: readonly string[],
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildClassifyPrompt(text, categories) }],
    temperature: 0,
  }
}

interface ChatResponseLike {
  readonly choices?: readonly { readonly message?: { readonly content?: unknown } }[]
}

/** 去掉可能的代码块围栏，取出 JSON 本体 */
function parseJsonLenient(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return JSON.parse(fenced ? fenced[1] : text)
}

/**
 * 从响应 JSON 严格提取 {label, confidence}。
 * 结构异常 / JSON 解析失败 / 字段非法一律抛中文错。
 */
export function extractJsonLabel(data: unknown): ClassifyResult {
  const choices = (data as ChatResponseLike | null | undefined)?.choices
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('接口返回异常：缺少 choices 字段')
  }
  const content = choices[0]?.message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('接口返回异常：助手的回复内容为空')
  }
  let parsed: unknown
  try {
    parsed = parseJsonLenient(content.trim())
  } catch {
    throw new Error('接口返回异常：无法解析 JSON 分类结果')
  }
  const rec = parsed as { readonly label?: unknown; readonly confidence?: unknown } | null
  if (typeof rec !== 'object' || rec === null || Array.isArray(rec)) {
    throw new Error('接口返回异常：分类结果不是 JSON 对象')
  }
  if (typeof rec.label !== 'string' || rec.label.trim() === '') {
    throw new Error('接口返回异常：缺少 label 字段')
  }
  const conf = rec.confidence
  if (typeof conf !== 'number' || !(conf >= 0 && conf <= 1)) {
    throw new Error('接口返回异常：confidence 不是 0~1 的数字')
  }
  return { label: rec.label.trim(), confidence: conf }
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

/** 生成可复制的分类报告 */
export function formatResult(result: ClassifyResult, categories: readonly string[]): string {
  return [
    '## 文本分类',
    '',
    `候选类别：${categories.join('、')}`,
    `分类结果：${result.label}`,
    `置信度：${(result.confidence * 100).toFixed(1)}%`,
  ].join('\n')
}
