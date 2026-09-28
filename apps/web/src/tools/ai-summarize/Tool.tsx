import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AiSummarizeFormOptions, AiSummarizeInput } from './schema'
import {
  assertApiKey,
  buildChatUrl,
  buildSummarizeBody,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  extractReplyText,
  getSummaryLength,
  httpStatusMessage,
  networkErrorMessage,
  REQUEST_TIMEOUT_MS,
  storageKey,
  SUMMARY_LENGTHS,
} from './utils'
import type { ByokField } from './utils'

const EXAMPLE_TEXT = `人工智能（Artificial Intelligence，简称 AI）是计算机科学的一个重要分支，
它致力于让机器能够执行通常需要人类智能才能完成的任务，如理解语言、识别图像、
做出决策和解决问题。近年来，随着深度学习技术的突破，AI 在自然语言处理、
计算机视觉等领域取得了显著进展，正在深刻改变人们的工作与生活方式。`

/** 从 localStorage 读取 BYOK 配置（读不到时回退空字符串 / 默认值） */
function readStored(field: ByokField, fallback: string): string {
  try {
    return localStorage.getItem(storageKey(field)) ?? fallback
  } catch {
    return fallback
  }
}

export default function Tool() {
  const [apiKey, setApiKey] = useState(() => readStored('apiKey', ''))
  const [baseUrl, setBaseUrl] = useState(() => readStored('baseUrl', DEFAULT_BASE_URL))
  const [model, setModel] = useState(() => readStored('model', DEFAULT_MODEL))
  const [lengthId, setLengthId] = useState('standard')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  /** 更新 BYOK 配置并持久化到 localStorage（Key 不打日志、不外传） */
  function updateField(field: ByokField, value: string): void {
    if (field === 'apiKey') setApiKey(value)
    else if (field === 'baseUrl') setBaseUrl(value)
    else setModel(value)
    try {
      localStorage.setItem(storageKey(field), value)
    } catch {
      /* 隐私模式等导致 localStorage 不可用时忽略，本次会话内仍可用 */
    }
  }

  /** 一键清除已保存的 API Key */
  function clearApiKey(): void {
    setApiKey('')
    try {
      localStorage.removeItem(storageKey('apiKey'))
    } catch {
      /* 忽略 */
    }
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 调用 LLM 生成摘要：Key 为空 / 文本为空 / 网络异常都有中文提示 */
  async function handleGenerate(input: AiSummarizeInput): Promise<void> {
    setError('')
    setResult('')
    setPending(true)
    try {
      assertApiKey(apiKey)
      const opts = optionsSchema.parse({ length: lengthId })
      const body = buildSummarizeBody(
        input.text,
        model.trim() === '' ? DEFAULT_MODEL : model,
        opts.length,
      )
      const url = buildChatUrl(baseUrl)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      let resp: Response
      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Key 来自用户输入，不硬编码、不记日志
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
      } catch (err) {
        throw new Error(networkErrorMessage(err), { cause: err })
      } finally {
        clearTimeout(timer)
      }
      if (!resp.ok) throw new Error(httpStatusMessage(resp.status))
      const data: unknown = await resp.json()
      setResult(extractReplyText(data))
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  const lengthDef = (() => {
    try {
      return getSummaryLength(lengthId)
    } catch {
      return SUMMARY_LENGTHS[1]!
    }
  })()
  const keyReady = apiKey.trim() !== ''

  return (
    <MultiPanel<AiSummarizeInput, AiSummarizeFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ length: 'standard' }}
      example={{ text: EXAMPLE_TEXT }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          {/* 服务配置（BYOK） */}
          <fieldset className="rounded border border-slate-200 p-2 dark:border-slate-700">
            <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              服务配置（BYOK：使用你自己的 Key）
            </legend>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-slate-600 dark:text-slate-400">API Key</span>
                <input
                  type="password"
                  data-testid="api-key"
                  className="flex-1 rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="sk-…（必填，仅保存在本浏览器）"
                  value={apiKey}
                  onChange={(e) => updateField('apiKey', e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  data-testid="clear-key"
                  className={SECONDARY_BUTTON}
                  onClick={clearApiKey}
                >
                  清除 Key
                </button>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-slate-600 dark:text-slate-400">服务地址</span>
                <input
                  type="text"
                  data-testid="base-url"
                  className="flex-1 rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder={DEFAULT_BASE_URL}
                  value={baseUrl}
                  onChange={(e) => updateField('baseUrl', e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-slate-600 dark:text-slate-400">模型</span>
                <input
                  type="text"
                  data-testid="model-name"
                  className="flex-1 rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder={DEFAULT_MODEL}
                  value={model}
                  onChange={(e) => updateField('model', e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <p className="text-xs text-slate-500">
                Key 只保存在本浏览器
                localStorage，可一键清除；请求直接发往你填的服务地址，本站服务器不经手。
              </p>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              摘要长度
              <select
                data-testid="length-select"
                className="rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                value={lengthId}
                onChange={(e) => setLengthId(e.target.value)}
              >
                {SUMMARY_LENGTHS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}（{s.hint}）
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              data-testid="generate"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
              disabled={!keyReady || pending}
              onClick={() => void handleGenerate(input)}
            >
              {pending ? '生成中…' : '生成摘要'}
            </button>
            {!keyReady ? (
              <span data-testid="key-hint" className="text-sm text-amber-600 dark:text-amber-400">
                请先在上方填写 API Key
              </span>
            ) : null}
          </div>

          {pending ? <p className="text-sm text-slate-500">正在请求模型，请稍候…</p> : null}
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
              <p className="text-xs text-slate-500">摘要（{lengthDef.label}）：</p>
              <p
                data-testid="result"
                className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
              >
                {result}
              </p>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              在左侧粘贴长文本，选好摘要长度后点「生成摘要」。超长文本会自动截取前 20000
              字符；请求超时 60 秒。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result}
      downloadExt="txt"
    />
  )
}
