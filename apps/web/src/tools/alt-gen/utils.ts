/**
 * alt-gen —— 图片 Alt 文本生成的纯函数层
 *
 * 本文件不触碰任何浏览器 API（fetch 只在 Tool.tsx 中经 requestAltText 的可注入参数使用），
 * 可在 node 下被 vitest 完整测试。
 */

/** 默认接口地址（OpenAI 官方） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** 单次请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 60_000

/** 图片上限：10MB */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** 补充说明上限字符数 */
export const MAX_HINT_CHARS = 2000

/** 图片类型 */
export type ImageKind = 'photo' | 'screenshot' | 'chart' | 'illustration' | 'other'

export const IMAGE_KIND_LABELS: Record<ImageKind, string> = {
  photo: '照片',
  screenshot: '截图',
  chart: '图表',
  illustration: '插画',
  other: '其他',
}

const KIND_GUIDANCE: Record<ImageKind, string> = {
  photo: '这是一张照片，请客观描述画面中的主体、动作与场景。',
  screenshot: '这是一张界面截图，请描述界面布局与关键元素、文字内容。',
  chart: '这是一张图表，请描述图表类型、坐标轴含义与数据传达的核心结论。',
  illustration: '这是一张插画，请描述画面风格、主体与氛围。',
  other: '请客观描述这张图片的内容。',
}

/**
 * 生成请求 alt 文本的 prompt：
 * 要求简洁客观、不超过 125 字符、不写"图片显示/这张图片"类废话。
 */
export function buildAltPrompt(imageKind: ImageKind, extraHint: string): string {
  const kindText = KIND_GUIDANCE[imageKind] ?? KIND_GUIDANCE.other
  const hint = extraHint.trim()
  const extra = hint === '' ? '' : `补充要求：${hint}。`
  return (
    `请为这张图片生成一段无障碍 alt 替代文本。${kindText}` +
    '要求：简洁客观，只描述对理解内容必要的信息；不超过 125 个字符；' +
    '不要以"图片显示""这张图片""可以看到"等废话开头；不要输出引号。' +
    extra
  )
}

/** BYOK 配置 */
export interface AltGenConfig {
  readonly baseURL: string
  readonly model: string
  readonly apiKey: string
  readonly imageKind: ImageKind
  readonly extraHint: string
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

/** 校验补充说明：为空返回空串，超长抛错 */
export function validateHint(hint: string): string {
  const text = hint.trim()
  if (text.length > MAX_HINT_CHARS) {
    throw new Error(`补充说明过长：${text.length} 字符，超过 ${MAX_HINT_CHARS} 上限`)
  }
  return text
}

/** OpenAI-compatible 多模态请求体 */
export function buildRequestBody(
  model: string,
  dataUrl: string,
  prompt: string,
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
          { type: 'text', text: prompt },
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

export type FetchImpl = typeof fetch

/**
 * 请求模型生成 alt 文本。
 * fetchImpl 可注入（测试用 mock）；默认用全局 fetch。
 * Key 只进 Authorization 头，不进日志与错误信息。
 */
export async function requestAltText(
  imageDataUrl: string,
  config: AltGenConfig,
  fetchImpl: FetchImpl = globalThis.fetch,
): Promise<string> {
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    throw new Error('图片数据异常，请重新选择图片')
  }
  if (config.apiKey.trim() === '') {
    throw new Error('请先填写 API Key（BYOK：使用你自己的 Key）')
  }
  const url = chatCompletionsUrl(config.baseURL)
  const prompt = buildAltPrompt(config.imageKind, config.extraHint)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify(buildRequestBody(config.model.trim(), imageDataUrl, prompt)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    return extractAssistantText((await res.json()) as unknown)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒）`, { cause: err })
    }
    if (err instanceof TypeError) {
      throw new Error(
        '网络请求失败：请检查网络连接、baseURL，以及目标接口是否允许浏览器跨域（CORS）调用',
        {
          cause: err,
        },
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** 生成可复制 / 下载的 alt 文本报告 */
export function buildReport(imageKind: ImageKind, model: string, altText: string): string {
  return [
    '## 图片 Alt 文本',
    '',
    `图片类型：${IMAGE_KIND_LABELS[imageKind] ?? imageKind}`,
    `模型：${model}`,
    '',
    altText,
  ].join('\n')
}
