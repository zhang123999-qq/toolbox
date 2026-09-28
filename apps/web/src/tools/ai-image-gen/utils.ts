/**
 * ai-image-gen —— 图像生成的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch / 下载只在 Tool.tsx 中使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒）：图像生成通常比文本慢 */
export const REQUEST_TIMEOUT_MS = 120_000

/** 提示词上限字符数 */
export const MAX_PROMPT_CHARS = 4000

/** 支持的生成尺寸 */
export const IMAGE_SIZES = ['1024x1024', '1024x1792', '1792x1024'] as const
export type ImageSize = (typeof IMAGE_SIZES)[number]

/** BYOK 配置 */
export interface ImageGenConfig {
  readonly baseURL: string
  readonly model: string
  readonly apiKey: string
}

/** 拼出 images/generations 地址 */
export function imagesGenerationsUrl(baseURL: string): string {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('接口地址不能为空')
  }
  return `${baseURL.trim().replace(/\/+$/, '')}/images/generations`
}

/** 校验图像描述非空且不超长 */
export function validatePrompt(prompt: string): string {
  const text = prompt.trim()
  if (text === '') throw new Error('图像描述不能为空')
  if (text.length > MAX_PROMPT_CHARS) {
    throw new Error(`图像描述过长：${text.length} 字符，超过 ${MAX_PROMPT_CHARS} 上限`)
  }
  return text
}

/** 校验尺寸在支持列表内 */
export function validateSize(size: string): ImageSize {
  if ((IMAGE_SIZES as readonly string[]).includes(size)) return size as ImageSize
  throw new Error(`不支持的尺寸：${size}，可选 ${IMAGE_SIZES.join(' / ')}`)
}

/** OpenAI-compatible 请求体 */
export function buildRequestBody(
  model: string,
  prompt: string,
  size: ImageSize,
): {
  readonly model: string
  readonly prompt: string
  readonly size: ImageSize
  readonly n: number
} {
  return { model, prompt, size, n: 1 }
}

interface ImageDataLike {
  readonly url?: unknown
  readonly b64_json?: unknown
}
interface ImagesResponseLike {
  readonly data?: unknown
}

/** 生成结果：远端 url 或 base64 二选一 */
export type ImageResult =
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'b64'; readonly b64: string }

/** 从响应 JSON 取出图片；结构异常抛中文错 */
export function extractImageResult(data: unknown): ImageResult {
  const arr = (data as ImagesResponseLike | null | undefined)?.data
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('接口返回异常：缺少 data 数组')
  }
  const first = arr[0] as ImageDataLike | null | undefined
  const url = first?.url
  if (typeof url === 'string' && url.trim() !== '') return { kind: 'url', url: url.trim() }
  const b64 = first?.b64_json
  if (typeof b64 === 'string' && b64.trim() !== '') return { kind: 'b64', b64: b64.trim() }
  throw new Error('接口返回异常：data[0] 中没有可用的图片（url / b64_json）')
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

/** 生成可复制 / 下载的 Markdown 报告 */
export function buildReport(
  prompt: string,
  model: string,
  size: ImageSize,
  result: ImageResult,
): string {
  const img = result.kind === 'url' ? result.url : '（base64 图片，见页面展示）'
  return [
    '## 图像生成',
    '',
    `提示词：${prompt}`,
    `模型：${model}`,
    `尺寸：${size}`,
    '',
    `![生成的图像](${img})`,
  ].join('\n')
}
