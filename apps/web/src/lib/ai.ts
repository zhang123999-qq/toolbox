/**
 * 调用「用户自备 API」的共用实现（可行性 D 的工具）。
 *
 * 文本域 #46 摘要 / #47 改写 / #48 翻译 / #49 标题生成 都要走同一套
 * OpenAI 兼容的 chat completions 接口。按 DEVELOPMENT.md §8.4「工具之间禁止
 * 互相 import，共用逻辑一律上提到 lib」，这里只放与 UI 无关的请求逻辑。
 *
 * 数据流向：请求由浏览器直接发往用户填的接口地址，**不经本项目任何服务器**；
 * API Key 只保存在当前页面的输入框里（不写 localStorage、不发往别处）。
 */
export interface AiConfig {
  /** 接口地址，如 https://api.openai.com/v1 */
  readonly apiBase: string
  /** 用户自备的 API Key */
  readonly apiKey: string
  /** 模型名，如 gpt-4o-mini */
  readonly model: string
}

/** 单次请求的超时时间（毫秒） */
export const AI_TIMEOUT = 60_000

/** 去掉地址末尾多余的斜杠，避免拼出 `//chat/completions` */
export function normalizeBase(apiBase: string): string {
  return apiBase.trim().replace(/\/+$/, '')
}

/** 校验配置齐全；缺哪一项就在报错里点名 */
export function assertConfig(config: AiConfig): void {
  const missing: string[] = []
  if (normalizeBase(config.apiBase) === '') missing.push('接口地址')
  if (config.apiKey.trim() === '') missing.push('API Key')
  if (config.model.trim() === '') missing.push('模型名')
  if (missing.length > 0) {
    throw new Error('请先填写' + missing.join('、') + '：本工具需要你自备的大模型接口。')
  }
}

interface ChatResponse {
  readonly choices?: ReadonlyArray<{ readonly message?: { readonly content?: string } }>
}

/**
 * 发一次 chat completions 请求并返回消息正文。
 * 只做最小解析：取 choices[0].message.content，其余字段一概不猜。
 */
export async function chat(config: AiConfig, system: string, user: string): Promise<string> {
  assertConfig(config)
  const response = await fetch(normalizeBase(config.apiBase) + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + config.apiKey.trim(),
    },
    body: JSON.stringify({
      model: config.model.trim(),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT),
  })

  if (!response.ok) {
    throw new Error('接口返回 ' + response.status + '：' + (await response.text()).slice(0, 300))
  }
  const data = (await response.json()) as ChatResponse
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content === '') {
    throw new Error('接口没有返回文本内容（choices[0].message.content 为空）')
  }
  return content.trim()
}
