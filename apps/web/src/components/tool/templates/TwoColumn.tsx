import { useEffect, useMemo, useState } from 'react'
import type { ToolMeta } from '@toolbox/catalog'
import { useTranslate } from '../../../i18n'

export interface OptionDef<O> {
  readonly key: keyof O & string
  readonly label: string
  /** `text` 供需要自由输入的选项（前缀、正则、替换串…） */
  readonly kind: 'select' | 'boolean' | 'text'
  readonly values?: readonly (string | number)[]
  readonly placeholder?: string
}

/** 除 `text` 之外的附加输入框：diff / 三方合并这类「多段平级内容」、以及接口凭据用 */
export interface ExtraInputDef {
  /** 在输入对象里的字段名 */
  readonly key: string
  /** 已翻译好的标签 */
  readonly label: string
  /** 行数：凭据类填 1，正文类留空（默认 4 行） */
  readonly rows?: number
}

interface TwoColumnProps<I extends { text: string }, O extends object> {
  readonly meta: ToolMeta
  readonly initialInput: I
  readonly initialOptions: O
  /** 同步转换：输入或选项变化即重算 */
  readonly run?: (input: I, options: O) => string
  /** 异步转换（调外部接口的工具）：只在点「运行」时发起，避免误触付费接口 */
  readonly runAsync?: (input: I, options: O) => Promise<string>
  readonly example?: I
  readonly optionDefs?: readonly OptionDef<O>[]
  readonly extraInputs?: readonly ExtraInputDef[]
}

/** 输出区的统一视图：同步与异步两种来源归一 */
interface OutputView {
  readonly ok: boolean
  readonly pending: boolean
  readonly idle: boolean
  readonly value: string
}

/** 次级按钮（描边）统一外观，明暗两版成对给出；T3 模板复用同一份 */
export const SECONDARY_BUTTON =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * T2 双栏模板（spec/06 §5）
 * 适用：输入输出同构的转换 / 对比类工具。
 * 所有交互元素均带 data-testid（DEVELOPMENT.md §8.3）。
 */
export function TwoColumn<I extends { text: string }, O extends object>({
  meta,
  initialInput,
  initialOptions,
  run,
  runAsync,
  example,
  optionDefs,
  extraInputs,
}: TwoColumnProps<I, O>) {
  const [input, setInput] = useState<I>(initialInput)
  const [options, setOptions] = useState<O>(initialOptions)
  const [nonce, setNonce] = useState(0)
  const [copied, setCopied] = useState(false)
  // 异步结果单独存：它不随输入变化而重算，只在点「运行」时更新
  const [asyncState, setAsyncState] = useState<{
    status: 'idle' | 'pending' | 'done' | 'error'
    value: string
  }>({ status: 'idle', value: '' })
  const t = useTranslate()

  const computed = useMemo(() => {
    if (!run) return null
    try {
      return { ok: true as const, value: run(input, options) }
    } catch (error) {
      return {
        ok: false as const,
        value: error instanceof Error ? error.message : String(error),
      }
    }
    // nonce 用于「运行」按钮强制重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, options, run, nonce])

  useEffect(() => {
    // nonce 为 0 表示还没点过运行：异步工具不自动发请求
    if (!runAsync || nonce === 0) return
    let cancelled = false
    runAsync(input, options).then(
      (value) => {
        if (!cancelled) setAsyncState({ status: 'done', value })
      },
      (error: unknown) => {
        if (!cancelled) {
          setAsyncState({
            status: 'error',
            value: error instanceof Error ? error.message : String(error),
          })
        }
      },
    )
    return () => {
      cancelled = true
    }
    // 只在 nonce 变化时发起；input / options 取当次点击时的值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

  const view: OutputView = computed
    ? { ok: computed.ok, pending: false, idle: false, value: computed.value }
    : {
        ok: asyncState.status !== 'error',
        pending: asyncState.status === 'pending',
        idle: asyncState.status === 'idle',
        value: asyncState.value,
      }

  const output = view.ok ? view.value : ''

  function updateOption(key: keyof O & string, value: string | boolean) {
    setOptions((prev) => ({ ...prev, [key]: value }) as O)
  }

  function readExtra(key: string): string {
    const value = (input as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : ''
  }

  async function copy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function download() {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${meta.slug}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <label
          htmlFor="tool-input"
          className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {t('tool.input')}
        </label>
        <textarea
          id="tool-input"
          data-testid="input"
          className="min-h-64 w-full flex-1 resize-y rounded border border-slate-200 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder={t('tool.inputPlaceholder')}
          value={input.text}
          onChange={(event) => setInput({ ...input, text: event.target.value } as I)}
        />
        {extraInputs?.map((def) => (
          <div key={def.key} className="mt-2">
            <label
              htmlFor={'tool-input-' + def.key}
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              {def.label}
            </label>
            <textarea
              id={'tool-input-' + def.key}
              data-testid={'input-' + def.key}
              rows={def.rows ?? 4}
              className="w-full resize-y rounded border border-slate-200 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={readExtra(def.key)}
              onChange={(event) => setInput({ ...input, [def.key]: event.target.value } as I)}
            />
          </div>
        ))}
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
            onClick={() => {
              setNonce((n) => n + 1)
              // 异步工具在点击时就切到 pending：放在 effect 里会触发级联渲染
              if (runAsync) setAsyncState({ status: 'pending', value: '' })
            }}
          >
            {t('tool.run')}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => setInput(example ?? initialInput)}
          >
            {t('tool.example')}
          </button>
          <button
            type="button"
            data-testid="clear"
            className={SECONDARY_BUTTON}
            onClick={() => setInput(initialInput)}
          >
            {t('tool.clear')}
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('tool.output')}
          </span>
          {optionDefs?.length ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {optionDefs.map((def) => {
                if (def.kind === 'boolean') {
                  return (
                    <label key={def.key} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={Boolean(options[def.key])}
                        onChange={(event) => updateOption(def.key, event.target.checked)}
                      />
                      {def.label}
                    </label>
                  )
                }
                if (def.kind === 'text') {
                  return (
                    <label key={def.key} className="flex items-center gap-1">
                      {def.label}
                      <input
                        type="text"
                        data-testid={'option-' + def.key}
                        className="w-32 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        value={String(options[def.key] ?? '')}
                        placeholder={def.placeholder}
                        onChange={(event) => updateOption(def.key, event.target.value)}
                      />
                    </label>
                  )
                }
                return (
                  <label key={def.key} className="flex items-center gap-1">
                    {def.label}
                    <select
                      className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      value={String(options[def.key])}
                      onChange={(event) => updateOption(def.key, event.target.value)}
                    >
                      {(def.values ?? []).map((value) => (
                        <option key={String(value)} value={String(value)}>
                          {String(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>
          ) : null}
        </div>

        {view.pending ? (
          <p
            data-testid="output"
            className="min-h-64 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            {t('tool.running')}
          </p>
        ) : view.ok ? (
          <pre
            data-testid="output"
            className="min-h-64 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            {output || (view.idle ? t('tool.asyncIdle') : t('tool.empty'))}
          </pre>
        ) : (
          <p
            data-testid="output"
            role="alert"
            className="min-h-64 w-full flex-1 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {view.value}
          </p>
        )}

        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button type="button" data-testid="copy" className={SECONDARY_BUTTON} onClick={copy}>
            {copied ? t('tool.copied') : t('tool.copy')}
          </button>
          <button
            type="button"
            data-testid="download"
            className={SECONDARY_BUTTON}
            onClick={download}
          >
            {t('tool.download')}
          </button>
        </div>
      </div>
    </section>
  )
}
