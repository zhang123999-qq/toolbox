import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema, optionsSchema } from './schema'
import type { NamingGenForm, NamingGenInput, NamingGenOptions } from './schema'
import {
  DEFAULT_BASE_URL,
  DEFAULT_STYLE,
  REQUEST_TIMEOUT_MS,
  STYLES,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  parseListOutput,
  validateDescription,
  validateStyle,
} from './utils'
import type { NamingStyle } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 */

/** 单次生成请求：带超时；Key 只进 Authorization 头 */
async function callNamingGen(
  url: string,
  apiKey: string,
  model: string,
  desc: string,
  style: NamingStyle,
): Promise<string[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, desc, style)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    return parseListOutput(extractAssistantText((await res.json()) as unknown))
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
  const [form, setForm] = useState<NamingGenForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [names, setNames] = useState<string[]>([])
  const [checkedDesc, setCheckedDesc] = useState('')
  const [checkedStyle, setCheckedStyle] = useState<NamingStyle>(DEFAULT_STYLE)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '生成失败，请重试'
  }

  function set<K extends keyof NamingGenForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  async function handleGenerate(input: NamingGenInput, options: NamingGenOptions): Promise<void> {
    setError('')
    setNames([])
    let desc: string
    let style: NamingStyle
    try {
      desc = validateDescription(input.text)
      style = validateStyle(optionsSchema.parse(options).style)
      configSchema.parse(form)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const list = await callNamingGen(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        desc,
        style,
      )
      if (list.length === 0) throw new Error('接口返回异常：未能解析出候选命名')
      setNames(list)
      setCheckedDesc(desc)
      setCheckedStyle(style)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<NamingGenInput, NamingGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ style: DEFAULT_STYLE }}
      optionDefs={[{ key: 'style', label: '命名风格', kind: 'select', values: STYLES }]}
      example={{ text: '用户的姓名' }}
      renderOutput={(input, options) => (
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
          </div>
          <div>
            <button
              type="button"
              data-testid="generate"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleGenerate(input, options)}
            >
              {pending ? '生成中…' : '生成命名'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧用中文描述变量/函数的含义，右上角选择命名风格，点「生成命名」。
            候选名用右上角复制/下载按钮一次取走。
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
          {names.length > 0 ? (
            <ul data-testid="result" className="flex flex-col gap-1">
              {names.map((n) => (
                <li
                  key={n}
                  className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  {n}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      toText={() =>
        names.length === 0 ? '' : buildReport(checkedDesc, checkedStyle, form.model.trim(), names)
      }
      downloadExt="md"
    />
  )
}
