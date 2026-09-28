/**
 * ai-detect —— AI 检测的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 *
 * 实现说明：不做本地伪算法，直接请 LLM 分析并返回结构化 JSON，
 * 解析失败时明确报错，不编造结论。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 待检测文本上限字符数 */
export const MAX_TEXT_CHARS = 10_000

/** 待检测文本下限字符数：太短无法判断 */
export const MIN_TEXT_CHARS = 50

/** BYOK 配置 */
export interface AiDetectConfig {
  readonly baseURL: string
  readonly model: string
  readonly apiKey: string
}

/** 检测结论 */
export type Verdict = 'ai' | 'human' | 'uncertain'

/** 结构化检测结果 */
export interface DetectionResult {
  readonly verdict: Verdict
  readonly confidence: number
  readonly reasons: readonly string[]
}

/** 拼出 chat/completions 地址 */
export function chatCompletionsUrl(baseURL: string): string {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('接口地址不能为空')
  }
  return `${baseURL.trim().replace(/\/+$/, '')}/chat/completions`
}

/** 校验待检测文本：非空、不太短、不超长 */
export function validateText(text: string): string {
  const t = text.trim()
  if (t === '') throw new Error('待检测文本不能为空')
  if (t.length < MIN_TEXT_CHARS) {
    throw new Error(`文本太短（${t.length} 字符，少于 ${MIN_TEXT_CHARS} 字符），难以判断`)
  }
  if (t.length > MAX_TEXT_CHARS) {
    throw new Error(`文本过长：${t.length} 字符，超过 ${MAX_TEXT_CHARS} 上限`)
  }
  return t
}

/** 构造请模型分析的提示词：要求只返回 JSON */
export function buildDetectPrompt(text: string): string {
  return [
    '请分析下面这段文本是否疑似由 AI 生成。',
    '只返回 JSON，不要输出其他内容，格式如下：',
    '{"verdict": "ai" | "human" | "uncertain", "confidence": 0-100 的数字, "reasons": ["理由1", "理由2"]}',
    'verdict 含义：ai=疑似 AI 生成，human=疑似人类撰写，uncertain=无法确定。',
    '请从句式多样性、信息密度、逻辑跳跃、个性化表达等方面给出理由。',
    '---',
    text,
  ].join('\n')
}

/** OpenAI-compatible 请求体（temperature=0 求稳定结论） */
export function buildRequestBody(
  model: string,
  text: string,
): {
  readonly model: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly temperature: number
} {
  return {
    model,
    messages: [{ role: 'user', content: buildDetectPrompt(text) }],
    temperature: 0,
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

/** 解析模型返回的 JSON 结论；解析失败明确报错，不编造 */
export function parseVerdict(raw: string): DetectionResult {
  const text = raw.trim()
  if (text === '') throw new Error('模型返回为空，无法解析检测结果')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const m = /\{[\s\S]*\}/.exec(text)
    if (!m) throw new Error('模型返回的不是有效的 JSON，无法解析检测结果')
    try {
      parsed = JSON.parse(m[0])
    } catch {
      throw new Error('模型返回的不是有效的 JSON，无法解析检测结果')
    }
  }
  const obj = parsed as {
    readonly verdict?: unknown
    readonly confidence?: unknown
    readonly reasons?: unknown
  } | null
  const verdict = obj?.verdict
  if (verdict !== 'ai' && verdict !== 'human' && verdict !== 'uncertain') {
    throw new Error('模型返回的 verdict 字段无效')
  }
  const confidence = obj?.confidence
  if (
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100
  ) {
    throw new Error('模型返回的 confidence 字段无效（应为 0~100 的数字）')
  }
  const reasons = obj?.reasons
  if (!Array.isArray(reasons) || reasons.some((r) => typeof r !== 'string')) {
    throw new Error('模型返回的 reasons 字段无效（应为字符串数组）')
  }
  return { verdict, confidence, reasons }
}

/** 结论 → 中文标签 */
export function verdictLabel(v: Verdict): string {
  if (v === 'ai') return '疑似 AI 生成'
  if (v === 'human') return '疑似人类撰写'
  return '无法确定'
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

/** 生成可复制 / 下载的检测报告 */
export function buildReport(text: string, model: string, r: DetectionResult): string {
  return [
    '## AI 检测',
    '',
    `结论：${verdictLabel(r.verdict)}（置信度 ${r.confidence}%）`,
    `模型：${model}`,
    '',
    '### 理由',
    ...r.reasons.map((x, i) => `${i + 1}. ${x}`),
    '',
    '### 待检测文本',
    text.length > 500 ? text.slice(0, 500) + '…' : text,
  ].join('\n')
}
