import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { PromptOptimizeFormOptions, PromptOptimizeInput } from './schema'
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  REQUEST_TIMEOUT_MS,
  buildRequestBody,
  buildSystemPrompt,
  buildUserPrompt,
  chatCompletionsUrl,
  extractAssistantText,
  formatComparison,
  parseHttpError,
} from './utils'

/** API Key 在 localStorage 中的键；只存用户显式勾选「记住」时 */
const LS_KEY = 'toolbox:prompt-optimize:api-key'

/** 带超时的 fetch：超时抛中文错；Key 只出现在 Authorization 头里，不打日志 */
async function postChatCompletions(url: string, apiKey: string, body: unknown): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    return (await res.json()) as unknown
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        `请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒），请检查网络或更换 baseURL`,
        { cause: err },
      )
    }
    if (err instanceof TypeError)
      throw new Error('网络请求失败：请检查网络连接与 baseURL', { cause: err })
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export default function Tool() {
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [remember, setRemember] = useState(false)
  const [optimized, setOptimized] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const optionDefs: readonly OptionDef<PromptOptimizeFormOptions>[] = [
    { key: 'baseURL', label: '接口地址', kind: 'text', placeholder: DEFAULT_BASE_URL },
    { key: 'model', label: '模型', kind: 'text', placeholder: DEFAULT_MODEL },
  ]

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '优化失败，请重试'
  }

  /** 一键清除本地保存的 Key */
  function clearSavedKey(): void {
    try {
      localStorage.removeItem(LS_KEY)
    } catch {
      /* 忽略存储异常 */
    }
    setApiKey('')
  }

  async function handleOptimize(
    input: PromptOptimizeInput,
    opts: PromptOptimizeFormOptions,
  ): Promise<void> {
    setError('')
    setOptimized('')
    const parsed = (() => {
      try {
        return optionsSchema.parse({ baseURL: opts.baseURL, model: opts.model, apiKey })
      } catch (err) {
        setError(toChineseError(err))
        return null
      }
    })()
    if (!parsed) return
    let userPrompt: string
    try {
      userPrompt = buildUserPrompt(input.text)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      if (remember) {
        try {
          localStorage.setItem(LS_KEY, apiKey.trim())
        } catch {
          /* 忽略存储异常 */
        }
      }
      const data = await postChatCompletions(
        chatCompletionsUrl(parsed.baseURL),
        parsed.apiKey,
        buildRequestBody(parsed.model, buildSystemPrompt(), userPrompt),
      )
      setOptimized(extractAssistantText(data))
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<PromptOptimizeInput, PromptOptimizeFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ baseURL: DEFAULT_BASE_URL, model: DEFAULT_MODEL }}
      optionDefs={optionDefs}
      example={{ text: '写一篇关于远程办公的文章' }}
      renderOutput={(input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="prompt-optimize-key"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              API Key
            </label>
            <input
              id="prompt-optimize-key"
              type="password"
              data-testid="api-key"
              className="w-64 rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="sk-..."
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                data-testid="remember-key"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              记住 Key（存本地）
            </label>
            <button
              type="button"
              data-testid="clear-key"
              className={SECONDARY_BUTTON}
              onClick={clearSavedKey}
            >
              清除 Key
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            BYOK 模式：Key
            只保存在你的浏览器本地，请求直接发往你配置的接口地址，本站不经手、不记录。
          </p>
          <div>
            <button
              type="button"
              data-testid="optimize"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleOptimize(input, options)}
            >
              {pending ? '优化中…' : '开始优化'}
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
          {optimized ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  优化前
                </p>
                <pre
                  data-testid="raw-prompt"
                  className="whitespace-pre-wrap rounded border border-slate-200 p-2 text-sm dark:border-slate-700"
                >
                  {input.text.trim()}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  优化后
                </p>
                <pre
                  data-testid="optimized-prompt"
                  className="whitespace-pre-wrap rounded border border-emerald-200 bg-emerald-50 p-2 text-sm dark:border-emerald-800 dark:bg-emerald-950"
                >
                  {optimized}
                </pre>
              </div>
            </div>
          ) : null}
          {!optimized && !pending && !error ? (
            <p className="text-sm text-slate-500">
              左侧输入粗糙提示词，填好 Key 后点「开始优化」，这里会并排展示优化前后对比。
            </p>
          ) : null}
        </div>
      )}
      toText={(input) => (optimized ? formatComparison(input.text, optimized) : '')}
      downloadExt="md"
    />
  )
}
