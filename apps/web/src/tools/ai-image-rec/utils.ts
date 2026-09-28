/**
 * ai-image-rec —— 图像识别的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch / FileReader 只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 图片上限：10MB（超大图先压缩再传是调用方的事，这里只做拦截） */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** 提问上限字符数 */
export const MAX_QUESTION_CHARS = 2000

/** 未填提问时的默认问题 */
export const DEFAULT_QUESTION = '请详细描述这张图片的内容。'

/** BYOK 配置 */
export interface ImageRecConfig {
  readonly baseURL: string
  readonly model: string
  readonly apiKey: string
}

/** 待校验的图片文件信息（只取 size/type，不碰 File 本体） */
export interface ImageFileInfo {
  readonly size: number
  readonly type: string
}

/** 拼出 chat/completions 地址 */
export function chatCompletionsUrl(baseURL: string): string {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('接口地址不能为空')
  }
  return `${baseURL.trim().replace(/\/+$/, '')}/chat/completions`
}

/** 校验图片类型与大小 */
export function validateImage(file: ImageFileInfo): void {
  if (typeof file?.type !== 'string' || !file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error('图片文件大小异常')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`图片过大：${(file.size / 1024 / 1024).toFixed(1)}MB，超过 10MB 上限`)
  }
}

/** 校验提问：为空用默认问题，超长抛错 */
export function validateQuestion(question: string): string {
  const text = question.trim()
  if (text === '') return DEFAULT_QUESTION
  if (text.length > MAX_QUESTION_CHARS) {
    throw new Error(`提问过长：${text.length} 字符，超过 ${MAX_QUESTION_CHARS} 上限`)
  }
  return text
}

/** OpenAI-compatible 多模态请求体 */
export function buildRequestBody(
  model: string,
  question: string,
  dataUrl: string,
): {
  readonly model: string
  readonly messages: readonly {
    readonly role: string
    readonly content: readonly (
      | { readonly type: 'text'; readonly text: string }
      | { readonly type: 'image_url'; readonly image_url: { readonly url: string } }
    )[]
  }[]
} {
  return {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: question },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
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

/** 生成可复制 / 下载的识别报告 */
export function buildReport(question: string, model: string, description: string): string {
  return ['## 图像识别', '', `提问：${question}`, `模型：${model}`, '', description].join('\n')
}
