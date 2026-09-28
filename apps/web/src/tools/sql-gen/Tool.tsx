import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema, optionsSchema } from './schema'
import type { SqlGenForm, SqlGenInput, SqlGenOptions } from './schema'
import {
  DEFAULT_BASE_URL,
  DEFAULT_DIALECT,
  DIALECTS,
  REQUEST_TIMEOUT_MS,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  extractSqlCodeBlock,
  parseHttpError,
  validateDescription,
  validateDialect,
} from './utils'
import type { Dialect } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 */

/** 单次生成请求：带超时；Key 只进 Authorization 头 */
async function callSqlGen(
  url: string,
  apiKey: string,
  model: string,
  desc: string,
  dialect: Dialect,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, desc, dialect)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    return extractSqlCodeBlock(extractAssistantText((await res.json()) as unknown))
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
  const [form, setForm] = useState<SqlGenForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [sql, setSql] = useState('')
  const [checkedDesc, setCheckedDesc] = useState('')
  const [checkedDialect, setCheckedDialect] = useState<Dialect>(DEFAULT_DIALECT)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '生成失败，请重试'
  }

  function set<K extends keyof SqlGenForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  async function handleGenerate(input: SqlGenInput, options: SqlGenOptions): Promise<void> {
    setError('')
    setSql('')
    let desc: string
    let dialect: Dialect
    try {
      desc = validateDescription(input.text)
      dialect = validateDialect(optionsSchema.parse(options).dialect)
      configSchema.parse(form)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const text = await callSqlGen(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        desc,
        dialect,
      )
      setSql(text)
      setCheckedDesc(desc)
      setCheckedDialect(dialect)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<SqlGenInput, SqlGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ dialect: DEFAULT_DIALECT }}
      optionDefs={[{ key: 'dialect', label: 'SQL 方言', kind: 'select', values: DIALECTS }]}
      example={{ text: '查出 2024 年注册、订单金额超过 1000 的用户，按金额倒序' }}
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
              {pending ? '生成中…' : '生成 SQL'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧用自然语言描述需求，右上角选择 SQL 方言，点「生成 SQL」。模型只返回 SQL
            代码块，本站从中严格提取，找不到代码块会报错。
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
          {sql ? (
            <pre
              data-testid="result"
              className="whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              {sql}
            </pre>
          ) : null}
        </div>
      )}
      toText={() =>
        sql === '' ? '' : buildReport(checkedDesc, checkedDialect, form.model.trim(), sql)
      }
      downloadExt="md"
    />
  )
}
