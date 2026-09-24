import { useMemo, useState } from 'react'
import type { ToolMeta } from '@toolbox/catalog'

export interface OptionDef<O> {
  readonly key: keyof O & string
  readonly label: string
  readonly kind: 'select' | 'boolean'
  readonly values?: readonly (string | number)[]
}

interface TwoColumnProps<I extends { text: string }, O extends object> {
  readonly meta: ToolMeta
  readonly initialInput: I
  readonly initialOptions: O
  readonly run: (input: I, options: O) => string
  readonly example?: I
  readonly optionDefs?: readonly OptionDef<O>[]
}

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
  example,
  optionDefs,
}: TwoColumnProps<I, O>) {
  const [input, setInput] = useState<I>(initialInput)
  const [options, setOptions] = useState<O>(initialOptions)
  const [nonce, setNonce] = useState(0)
  const [copied, setCopied] = useState(false)

  const computed = useMemo(() => {
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

  const output = computed.ok ? computed.value : ''

  function updateOption(key: keyof O & string, value: string | boolean) {
    setOptions((prev) => ({ ...prev, [key]: value }) as O)
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
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3">
        <label htmlFor="tool-input" className="mb-2 text-sm font-medium text-slate-700">
          输入
        </label>
        <textarea
          id="tool-input"
          data-testid="input"
          className="min-h-64 w-full flex-1 resize-y rounded border border-slate-200 p-2 font-mono text-sm"
          placeholder="在此粘贴内容…"
          value={input.text}
          onChange={(event) => setInput({ ...input, text: event.target.value } as I)}
        />
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
            onClick={() => setNonce((n) => n + 1)}
          >
            运行
          </button>
          <button
            type="button"
            data-testid="example"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={() => setInput(example ?? initialInput)}
          >
            示例
          </button>
          <button
            type="button"
            data-testid="clear"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={() => setInput(initialInput)}
          >
            清空
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">输出</span>
          {optionDefs?.length ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {optionDefs.map((def) =>
                def.kind === 'boolean' ? (
                  <label key={def.key} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={Boolean(options[def.key])}
                      onChange={(event) => updateOption(def.key, event.target.checked)}
                    />
                    {def.label}
                  </label>
                ) : (
                  <label key={def.key} className="flex items-center gap-1">
                    {def.label}
                    <select
                      className="rounded border border-slate-300 px-1"
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
                ),
              )}
            </div>
          ) : null}
        </div>

        {computed.ok ? (
          <pre
            data-testid="output"
            className="min-h-64 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-sm"
          >
            {output || '（空）'}
          </pre>
        ) : (
          <p
            data-testid="output"
            role="alert"
            className="min-h-64 w-full flex-1 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700"
          >
            {computed.value}
          </p>
        )}

        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="copy"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={copy}
          >
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            data-testid="download"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={download}
          >
            下载
          </button>
        </div>
      </div>
    </section>
  )
}
