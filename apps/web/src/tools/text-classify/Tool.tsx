import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema } from './schema'
import type { TextClassifyForm, TextClassifyInput, TextClassifyOptions } from './schema'
import {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  buildRequestBody,
  chatCompletionsUrl,
  extractJsonLabel,
  formatResult,
  parseCategories,
  parseHttpError,
  validateText,
} from './utils'
import type { ClassifyResult } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 */

/** 单次分类请求：带超时；Key 只进 Authorization 头 */
async function callClassify(
  url: string,
  apiKey: string,
  model: string,
  text: string,
  categories: readonly string[],
): Promise<ClassifyResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, text, categories)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, body))
    }
    return extractJsonLabel((await res.json()) as unknown)
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

export default function Tool() {
  const [form, setForm] = useState<TextClassifyForm>({
    categories: '科技、体育、娱乐',
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [result, setResult] = useState<ClassifyResult | null>(null)
  const [checkedCategories, setCheckedCategories] = useState<string[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '分类失败，请重试'
  }

  function set<K extends keyof TextClassifyForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
      setForm({ ...form, [k]: e.target.value })
  }

  async function handleClassify(input: TextClassifyInput): Promise<void> {
    setError('')
    setResult(null)
    let text: string
    let categories: string[]
    try {
      text = validateText(input.text)
      categories = parseCategories(form.categories)
      configSchema.parse({ baseURL: form.baseURL, model: form.model, apiKey: form.apiKey })
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const r = await callClassify(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        text,
        categories,
      )
      setResult(r)
      setCheckedCategories(categories)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<TextClassifyInput, TextClassifyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      optionDefs={[]}
      example={{ text: '苹果公司发布了新款手机，搭载自研芯片，性能提升 40%' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              候选类别（逗号 / 顿号 / 换行分隔）
            </span>
            <textarea
              data-testid="categories"
              rows={2}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={form.categories}
              onChange={set('categories')}
            />
          </label>
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
          </div>
          <div>
            <button
              type="button"
              data-testid="classify"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleClassify(input)}
            >
              {pending ? '分类中…' : '开始分类'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧粘贴文本，上方填写候选类别，右侧配置接口地址、模型与 Key，点「开始分类」。
            模型只返回 JSON，由本工具严格解析出类别与置信度。
          </p>
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
            <div data-testid="result" className="flex flex-col gap-1 text-sm">
              <div>
                分类结果：
                <strong className="text-slate-900 dark:text-slate-100">{result.label}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                置信度：{(result.confidence * 100).toFixed(1)}%
              </div>
            </div>
          ) : null}
        </div>
      )}
      toText={() => (result === null ? '' : formatResult(result, checkedCategories))}
      downloadExt="md"
    />
  )
}
