import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema } from './schema'
import type { RegexGenForm, RegexGenInput, RegexGenOptions } from './schema'
import {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  buildReport,
  buildRequestBody,
  buildTestResult,
  chatCompletionsUrl,
  extractAssistantText,
  extractRegexCodeBlock,
  parseHttpError,
  validateDescription,
  validateTestText,
} from './utils'
import type { RegexTestResult } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 * 正则测试是纯 JS 本地计算，不经过网络。
 */

/** 单次生成请求：带超时；Key 只进 Authorization 头 */
async function callRegexGen(
  url: string,
  apiKey: string,
  model: string,
  desc: string,
): Promise<{ pattern: string; explanation: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, desc)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    const full = extractAssistantText((await res.json()) as unknown)
    const pattern = extractRegexCodeBlock(full)
    const explanation = full.replace(/```(?:\w+)?\s*\n?[\s\S]*?```/, '').trim()
    return { pattern, explanation }
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
  const [form, setForm] = useState<RegexGenForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [pattern, setPattern] = useState('')
  const [explanation, setExplanation] = useState('')
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<RegexTestResult | null>(null)
  const [checkedDesc, setCheckedDesc] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '生成失败，请重试'
  }

  function set<K extends keyof RegexGenForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  async function handleGenerate(input: RegexGenInput): Promise<void> {
    setError('')
    setPattern('')
    setExplanation('')
    setTestResult(null)
    let desc: string
    try {
      desc = validateDescription(input.text)
      configSchema.parse(form)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const { pattern: p, explanation: e } = await callRegexGen(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        desc,
      )
      setPattern(p)
      setExplanation(e)
      setCheckedDesc(desc)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  function handleTest(): void {
    setError('')
    try {
      const text = validateTestText(testText)
      setTestResult(buildTestResult(pattern, text))
    } catch (err) {
      setTestResult(null)
      setError(toChineseError(err))
    }
  }

  return (
    <MultiPanel<RegexGenInput, RegexGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '匹配中国大陆手机号' }}
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
              data-testid="generate"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleGenerate(input)}
            >
              {pending ? '生成中…' : '生成正则'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧用自然语言描述匹配规则，点「生成正则」。下方测试区是纯本地计算：
            改正则、贴测试文本，点「测试匹配」即时看结果，不消耗 Key。
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
          {pattern ? (
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1 text-sm">
                <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">正则</span>
                <input
                  type="text"
                  data-testid="pattern"
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                />
              </label>
              {explanation ? (
                <pre
                  data-testid="explanation"
                  className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100"
                >
                  {explanation}
                </pre>
              ) : null}
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">测试文本（本地匹配）</span>
                <textarea
                  data-testid="test-text"
                  rows={3}
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                />
              </label>
              <div>
                <button
                  type="button"
                  data-testid="test-match"
                  className="rounded bg-slate-600 px-3 py-1.5 text-sm text-white hover:opacity-90"
                  onClick={handleTest}
                >
                  测试匹配
                </button>
              </div>
              {testResult ? (
                <div
                  data-testid="test-result"
                  className="rounded bg-slate-100 p-2 text-sm dark:bg-slate-900"
                >
                  <p className="text-slate-600 dark:text-slate-400">
                    命中 {testResult.matches.length} 处
                  </p>
                  {testResult.matches.map((m, i) => (
                    <code
                      key={`${i}-${m}`}
                      className="mr-1 rounded bg-yellow-100 px-1 font-mono dark:bg-yellow-900"
                    >
                      {m === '' ? '(空)' : m}
                    </code>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      toText={() =>
        pattern === '' ? '' : buildReport(checkedDesc, form.model.trim(), pattern, explanation)
      }
      downloadExt="md"
    />
  )
}
