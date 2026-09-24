import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ToolMeta } from '@toolbox/catalog'
import { useTranslate } from '../../../i18n'
import { SECONDARY_BUTTON } from './TwoColumn'
import type { ExtraInputDef, OptionDef } from './TwoColumn'

interface MultiPanelProps<I extends { text: string }, O extends object> {
  readonly meta: ToolMeta
  readonly initialInput: I
  readonly initialOptions: O
  readonly optionDefs?: readonly OptionDef<O>[]
  readonly example?: I
  /** 除 `text` 之外的附加输入框（diff 这类需要两段平级内容的工具） */
  readonly extraInputs?: readonly ExtraInputDef[]
  /** 输出区由工具自己决定怎么呈现：渲染结果、图表、媒体控件都行 */
  readonly renderOutput: (input: I, options: O) => ReactNode
  /** 供「复制 / 下载」使用的纯文本版本（通常是同一结果的源码或文本表示） */
  readonly toText: (input: I, options: O) => string
  /** 下载文件的扩展名 */
  readonly downloadExt?: string
}

/**
 * T3 多面板模板（DEVELOPMENT.md §七）
 *
 * 与 T2 的差别：T2 的输出固定是一段 `<pre>` 文本，而 T3 的输出区交给工具自己渲染
 * —— 用于输出不是纯文本的场合（Markdown 预览、图表、语音控件等），
 * 或参数较多需要把选项区独立出来的场合。
 *
 * 交互元素同样带 data-testid（DEVELOPMENT.md §8.3）：
 * input / output / run / clear / copy / download / example。
 */
export function MultiPanel<I extends { text: string }, O extends object>({
  meta,
  initialInput,
  initialOptions,
  optionDefs,
  example,
  extraInputs,
  renderOutput,
  toText,
  downloadExt = 'txt',
}: MultiPanelProps<I, O>) {
  const [input, setInput] = useState<I>(initialInput)
  const [options, setOptions] = useState<O>(initialOptions)
  const [copied, setCopied] = useState(false)
  const t = useTranslate()

  function updateOption(key: keyof O & string, value: string | boolean) {
    setOptions((prev) => ({ ...prev, [key]: value }) as O)
  }

  function readExtra(key: string): string {
    const value = (input as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : ''
  }

  async function copy() {
    const text = toText(input, options)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function download() {
    const text = toText(input, options)
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${meta.slug}.${downloadExt}`
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
                // 自由输入 / 多行输入：都带 data-testid，便于组件测试定位
                if (def.kind === 'text' || def.kind === 'textarea') {
                  return (
                    <label key={def.key} className="flex items-center gap-1">
                      {def.label}
                      {def.kind === 'textarea' ? (
                        <textarea
                          data-testid={'option-' + def.key}
                          rows={3}
                          className="w-48 resize-y rounded border border-slate-300 px-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          value={String(options[def.key] ?? '')}
                          placeholder={def.placeholder}
                          onChange={(event) => updateOption(def.key, event.target.value)}
                        />
                      ) : (
                        <input
                          type="text"
                          data-testid={'option-' + def.key}
                          className="w-32 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          value={String(options[def.key] ?? '')}
                          placeholder={def.placeholder}
                          onChange={(event) => updateOption(def.key, event.target.value)}
                        />
                      )}
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

        <div
          data-testid="output"
          className="min-h-64 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        >
          {renderOutput(input, options)}
        </div>

        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
            onClick={() => setInput((prev) => ({ ...prev }))}
          >
            {t('tool.run')}
          </button>
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
