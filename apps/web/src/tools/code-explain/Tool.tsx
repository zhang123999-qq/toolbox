import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema, optionsSchema } from './schema'
import type { CodeExplainForm, CodeExplainInput, CodeExplainOptions } from './schema'
import {
  DEFAULT_BASE_URL,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  REQUEST_TIMEOUT_MS,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  validateCode,
  validateLanguage,
} from './utils'
import type { Language } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 */

/** 单次解释请求：带超时；Key 只进 Authorization 头 */
async function callExplain(
  url: string,
  apiKey: string,
  model: string,
  code: string,
  language: Language,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, code, language)),
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
    if (err instanceof TypeError)
      throw new Error('网络请求失败：请检查网络连接与 baseURL', { cause: err })
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export default function Tool() {
  const [form, setForm] = useState<CodeExplainForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [explanation, setExplanation] = useState('')
  const [checkedCode, setCheckedCode] = useState('')
  const [checkedLang, setCheckedLang] = useState<Language>(DEFAULT_LANGUAGE)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '解释失败，请重试'
  }

  function set<K extends keyof CodeExplainForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  async function handleExplain(
    input: CodeExplainInput,
    options: CodeExplainOptions,
  ): Promise<void> {
    setError('')
    setExplanation('')
    let code: string
    let language: Language
    try {
      code = validateCode(input.text)
      language = validateLanguage(optionsSchema.parse(options).language)
      configSchema.parse(form)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const text = await callExplain(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        code,
        language,
      )
      setExplanation(text)
      setCheckedCode(code)
      setCheckedLang(language)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<CodeExplainInput, CodeExplainOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: DEFAULT_LANGUAGE }}
      optionDefs={[{ key: 'language', label: '代码语言', kind: 'select', values: LANGUAGES }]}
      example={{ text: 'def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a' }}
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
              data-testid="explain"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleExplain(input, options)}
            >
              {pending ? '解释中…' : '开始解释'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧粘贴代码，右上角选择语言（默认自动识别），点「开始解释」。解释按功能概述 /
            关键逻辑 / 注意事项三段输出。
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
          {explanation ? (
            <pre
              data-testid="result"
              className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100"
            >
              {explanation}
            </pre>
          ) : null}
        </div>
      )}
      toText={() =>
        explanation === '' ? '' : buildReport(checkedCode, checkedLang, form.model.trim(), explanation)
      }
      downloadExt="md"
    />
  )
}
