import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema } from './schema'
import type { AiDetectForm, AiDetectInput } from './schema'
import {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  parseVerdict,
  validateText,
  verdictLabel,
} from './utils'
import type { DetectionResult, Verdict } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 */

/** 单次检测请求：带超时；Key 只进 Authorization 头 */
async function callDetect(
  url: string,
  apiKey: string,
  model: string,
  text: string,
): Promise<DetectionResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, text)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, bodyText))
    }
    return parseVerdict(extractAssistantText((await res.json()) as unknown))
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

function badgeClass(v: Verdict): string {
  if (v === 'ai')
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800'
  if (v === 'human')
    return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-300 dark:border-green-800'
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
}

export default function Tool() {
  const [form, setForm] = useState<AiDetectForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [checkedText, setCheckedText] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '检测失败，请重试'
  }

  function set<K extends keyof AiDetectForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  async function handleDetect(input: AiDetectInput): Promise<void> {
    setError('')
    setResult(null)
    let text: string
    try {
      text = validateText(input.text)
      configSchema.parse(form)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const r = await callDetect(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        text,
      )
      setResult(r)
      setCheckedText(text)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AiDetectInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{
        text: '随着科技的快速发展，人工智能已经深入到我们生活的方方面面。从智能手机到智能家居，从自动驾驶到医疗诊断，AI 正在以前所未有的速度改变着世界。未来，人工智能将继续推动社会进步，为人类创造更多价值。',
      }}
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
          </div>
          <div>
            <button
              type="button"
              data-testid="detect"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleDetect(input)}
            >
              {pending ? '检测中…' : '开始检测'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧粘贴待检测文本（至少 50 字符），点「开始检测」。结论仅供参考，AI 检测本身没有 100%
            准确的方法。
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
            <div data-testid="result" className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  data-testid="verdict"
                  className={`rounded border px-2 py-0.5 text-sm font-medium ${badgeClass(result.verdict)}`}
                >
                  {verdictLabel(result.verdict)}
                </span>
                <span
                  data-testid="confidence"
                  className="text-sm text-slate-600 dark:text-slate-400"
                >
                  置信度 {result.confidence}%
                </span>
              </div>
              <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-800">
                <div
                  data-testid="confidence-bar"
                  className="h-2 rounded bg-brand"
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              {result.reasons.length > 0 ? (
                <ol className="list-decimal pl-5 text-sm text-slate-700 dark:text-slate-300">
                  {result.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      toText={() =>
        result === null || checkedText === ''
          ? ''
          : buildReport(checkedText, form.model.trim(), result)
      }
      downloadExt="md"
    />
  )
}
