import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { ModelCompareInput, ModelSideForm } from './schema'
import {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  formatDurationMs,
  parseHttpError,
  validatePrompt,
} from './utils'
import type { ModelSide, SideResult } from './utils'

const LS_KEY_A = 'toolbox:model-compare:key-a'
const LS_KEY_B = 'toolbox:model-compare:key-b'

function readSavedKey(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

/** 单侧请求：带超时；Key 只进 Authorization 头，不打日志 */
async function callSide(url: string, side: ModelSide, prompt: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${side.apiKey}` },
      body: JSON.stringify(buildRequestBody(side.model, prompt)),
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

const EMPTY_SIDE: SideResult = { model: '', output: '', durationMs: 0, error: '' }

function SideForm({
  title,
  testPrefix,
  form,
  setForm,
  onSync,
}: {
  title: string
  testPrefix: string
  form: ModelSideForm
  setForm: (f: ModelSideForm) => void
  onSync: () => void
}): React.ReactElement {
  const set = (k: keyof ModelSideForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })
  return (
    <div className="flex flex-1 flex-col gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
        <button
          type="button"
          data-testid={`${testPrefix}-sync`}
          className={SECONDARY_BUTTON}
          onClick={onSync}
        >
          同步 A→B
        </button>
      </div>
      <label className="flex items-center gap-1 text-sm">
        <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">接口地址</span>
        <input
          type="text"
          data-testid={`${testPrefix}-base-url`}
          className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
          value={form.baseURL}
          onChange={set('baseURL')}
        />
      </label>
      <label className="flex items-center gap-1 text-sm">
        <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">模型</span>
        <input
          type="text"
          data-testid={`${testPrefix}-model`}
          className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
          value={form.model}
          onChange={set('model')}
        />
      </label>
      <label className="flex items-center gap-1 text-sm">
        <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">API Key</span>
        <input
          type="password"
          data-testid={`${testPrefix}-key`}
          autoComplete="off"
          className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
          value={form.apiKey}
          onChange={set('apiKey')}
        />
      </label>
    </div>
  )
}

export default function Tool() {
  const [sideA, setSideA] = useState<ModelSideForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: readSavedKey(LS_KEY_A),
  })
  const [sideB, setSideB] = useState<ModelSideForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o',
    apiKey: readSavedKey(LS_KEY_B),
  })
  const [resultA, setResultA] = useState<SideResult>(EMPTY_SIDE)
  const [resultB, setResultB] = useState<SideResult>(EMPTY_SIDE)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '对比失败，请重试'
  }

  function clearKeys(): void {
    try {
      localStorage.removeItem(LS_KEY_A)
      localStorage.removeItem(LS_KEY_B)
    } catch {
      /* 忽略存储异常 */
    }
    setSideA((p) => ({ ...p, apiKey: '' }))
    setSideB((p) => ({ ...p, apiKey: '' }))
  }

  async function handleCompare(input: ModelCompareInput): Promise<void> {
    setError('')
    setResultA(EMPTY_SIDE)
    setResultB(EMPTY_SIDE)
    const parsed = (() => {
      try {
        return optionsSchema.parse({ sideA, sideB })
      } catch (err) {
        setError(toChineseError(err))
        return null
      }
    })()
    if (!parsed) return
    let prompt: string
    try {
      prompt = validatePrompt(input.text)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      try {
        localStorage.setItem(LS_KEY_A, parsed.sideA.apiKey)
        localStorage.setItem(LS_KEY_B, parsed.sideB.apiKey)
      } catch {
        /* 忽略存储异常 */
      }
      const run = async (side: ModelSide): Promise<SideResult> => {
        const started = Date.now()
        try {
          const output = await callSide(chatCompletionsUrl(side.baseURL), side, prompt)
          return { model: side.model, output, durationMs: Date.now() - started, error: '' }
        } catch (err) {
          return {
            model: side.model,
            output: '',
            durationMs: Date.now() - started,
            error: toChineseError(err),
          }
        }
      }
      const [a, b] = await Promise.all([run(parsed.sideA), run(parsed.sideB)])
      setResultA(a)
      setResultB(b)
    } finally {
      setPending(false)
    }
  }

  function SideResultView({
    title,
    testPrefix,
    result,
  }: {
    title: string
    testPrefix: string
    result: SideResult
  }): React.ReactElement | null {
    if (result.model === '') return null
    return (
      <div className="flex-1 rounded border border-slate-200 p-2 dark:border-slate-700">
        <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          {title}：{result.model}
        </p>
        {result.error === '' ? (
          <>
            <p data-testid={`${testPrefix}-time`} className="mb-1 text-xs text-slate-500">
              耗时：{formatDurationMs(result.durationMs)}
            </p>
            <pre
              data-testid={`${testPrefix}-output`}
              className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100"
            >
              {result.output}
            </pre>
          </>
        ) : (
          <p
            role="alert"
            data-testid={`${testPrefix}-error`}
            className="text-sm text-red-600 dark:text-red-400"
          >
            {result.error}
          </p>
        )}
      </div>
    )
  }

  return (
    <MultiPanel<ModelCompareInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '用一句话解释什么是复利。' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <SideForm
              title="模型 A"
              testPrefix="a"
              form={sideA}
              setForm={setSideA}
              onSync={() =>
                setSideB((p) => ({ ...p, baseURL: sideA.baseURL, apiKey: sideA.apiKey }))
              }
            />
            <SideForm
              title="模型 B"
              testPrefix="b"
              form={sideB}
              setForm={setSideB}
              onSync={() =>
                setSideA((p) => ({ ...p, baseURL: sideB.baseURL, apiKey: sideB.apiKey }))
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="compare"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleCompare(input)}
            >
              {pending ? '对比中…' : '开始对比'}
            </button>
            <button
              type="button"
              data-testid="clear-key"
              className={SECONDARY_BUTTON}
              onClick={clearKeys}
            >
              清除 Key
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            BYOK 模式：两侧 Key 保存在浏览器本地；「同步 A→B」可把 A 的地址与 Key 复制到
            B（可复用同一 Key）。
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
          {resultA.model !== '' || resultB.model !== '' ? (
            <div className="flex flex-col gap-2 md:flex-row">
              <SideResultView title="模型 A" testPrefix="result-a" result={resultA} />
              <SideResultView title="模型 B" testPrefix="result-b" result={resultB} />
            </div>
          ) : null}
          {resultA.model === '' && resultB.model === '' && !pending && !error ? (
            <p className="text-sm text-slate-500">
              左侧输入提示词，配置好两侧模型后点「开始对比」。
            </p>
          ) : null}
        </div>
      )}
      toText={(input) =>
        input.text.trim() === '' ? '' : buildReport(input.text.trim(), resultA, resultB)
      }
      downloadExt="md"
    />
  )
}
