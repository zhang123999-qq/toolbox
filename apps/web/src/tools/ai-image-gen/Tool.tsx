import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { configSchema } from './schema'
import type { AiImageGenInput, ImageGenForm } from './schema'
import {
  DEFAULT_BASE_URL,
  IMAGE_SIZES,
  REQUEST_TIMEOUT_MS,
  buildReport,
  buildRequestBody,
  extractImageResult,
  imagesGenerationsUrl,
  parseHttpError,
  validatePrompt,
  validateSize,
} from './utils'
import type { ImageResult, ImageSize } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 */

/** 单次生成请求：带超时；Key 只进 Authorization 头 */
async function callGenerate(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  size: (typeof IMAGE_SIZES)[number],
): Promise<ImageResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, prompt, size)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    return extractImageResult((await res.json()) as unknown)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒）`, { cause: err })
    }
    if (err instanceof TypeError)
      throw new Error('网络请求失败：请检查网络连接与 baseURL', { cause: err })
    throw err
  } finally {
    clearTimeout(timer)
  }
}

const EMPTY: ImageResult | null = null

export default function Tool() {
  const [form, setForm] = useState<ImageGenForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'dall-e-3',
    apiKey: '',
  })
  const [size, setSize] = useState<ImageSize>(IMAGE_SIZES[0])
  const [result, setResult] = useState<ImageResult | null>(EMPTY)
  const [usedPrompt, setUsedPrompt] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '生成失败，请重试'
  }

  function set<K extends keyof ImageGenForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  async function handleGenerate(input: AiImageGenInput): Promise<void> {
    setError('')
    setResult(EMPTY)
    let prompt: string
    let checkedSize: (typeof IMAGE_SIZES)[number]
    try {
      prompt = validatePrompt(input.text)
      checkedSize = validateSize(size)
      configSchema.parse(form)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const r = await callGenerate(
        imagesGenerationsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        prompt,
        checkedSize,
      )
      setResult(r)
      setUsedPrompt(prompt)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  /** 下载图片：url 与 b64 都先转成 blob 再触发下载 */
  async function downloadImage(): Promise<void> {
    if (!result) return
    try {
      const src = result.kind === 'url' ? result.url : `data:image/png;base64,${result.b64}`
      const blob = await (await fetch(src)).blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `ai-image-${Date.now()}.png`
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setError('图片下载失败：可能是跨域限制，请右键图片另存')
    }
  }

  const src = result?.kind === 'url' ? result.url : result ? `data:image/png;base64,${result.b64}` : ''

  return (
    <MultiPanel<AiImageGenInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '一只橘猫坐在窗台上看日落，赛博朋克风格' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">接口地址</span>
              <input
                type="text"
                data-testid="base-url"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.baseURL}
                onChange={set('baseURL')}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">模型</span>
              <input
                type="text"
                data-testid="model"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.model}
                onChange={set('model')}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">API Key</span>
              <input
                type="password"
                data-testid="api-key"
                autoComplete="off"
                placeholder="只保存在内存，刷新页面即清除"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.apiKey}
                onChange={set('apiKey')}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">尺寸</span>
              <select
                data-testid="size"
                className="rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={size}
                onChange={(e) => setSize(validateSize(e.target.value))}
              >
                {IMAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <button
              type="button"
              data-testid="generate"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleGenerate(input)}
            >
              {pending ? '生成中…' : '生成图像'}
            </button>
          </div>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {result ? (
            <div className="flex flex-col gap-2">
              <img
                data-testid="result-image"
                src={src}
                alt={usedPrompt}
                className="max-w-full rounded border border-slate-200 dark:border-slate-700"
              />
              <div>
                <button
                  type="button"
                  data-testid="download-image"
                  className={SECONDARY_BUTTON}
                  onClick={() => void downloadImage()}
                >
                  下载图片
                </button>
              </div>
            </div>
          ) : !pending && !error ? (
            <p className="text-sm text-slate-500">
              左侧输入图像描述，配置好接口后点「生成图像」。Key 只存内存，不落地。
            </p>
          ) : null}
        </div>
      )}
      toText={() =>
        result === null || usedPrompt === '' ? '' : buildReport(usedPrompt, form.model.trim(), size, result)
      }
      downloadExt="md"
    />
  )
}
