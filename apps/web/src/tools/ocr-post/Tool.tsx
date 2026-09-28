import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { OcrPostFormOptions, OcrPostInput } from './schema'
import { postProcess } from './utils'

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '处理失败，请重试'
}

export default function Tool() {
  const optionDefs: readonly OptionDef<OcrPostFormOptions>[] = [
    { key: 'confusables', label: '形近字纠错', kind: 'boolean' },
    { key: 'spaces', label: '多余空白清理', kind: 'boolean' },
    { key: 'lineBreaks', label: '多余换行合并', kind: 'boolean' },
    { key: 'width', label: '全半角统一', kind: 'boolean' },
  ]

  return (
    <MultiPanel<OcrPostInput, OcrPostFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ confusables: true, spaces: true, lineBreaks: true, width: true }}
      optionDefs={optionDefs}
      example={{
        text: 'Ｔｈｉｓ　ｉｓ　ａ　ｔｅｓｔ。\n你 好，世 界！\n这是第一行\n这是第二行\n\n第二段 h0me 电话 138O1234567',
      }}
      renderOutput={(input, options) => {
        if (input.text.trim() === '') {
          return (
            <p className="text-sm text-slate-500">
              左侧粘贴 OCR 识别文本，右上角开关规则后自动纠错。
            </p>
          )
        }
        let view
        try {
          const parsed = optionsSchema.parse(options)
          view = { ok: true as const, result: postProcess(input.text, parsed) }
        } catch (err) {
          view = { ok: false as const, message: toChineseError(err) }
        }
        if (!view.ok) {
          return (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {view.message}
            </div>
          )
        }
        const { result } = view
        return (
          <div className="flex flex-col gap-3">
            <p data-testid="changes-count" className="text-sm text-slate-600 dark:text-slate-400">
              共改动 <strong>{result.changes}</strong> 处
              {result.applied.length > 0
                ? `（${result.applied.join('、')}）`
                : '（未启用任何规则）'}
            </p>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">纠错后</p>
              <pre
                data-testid="fixed-text"
                className="whitespace-pre-wrap rounded border border-emerald-200 bg-emerald-50 p-2 text-sm dark:border-emerald-800 dark:bg-emerald-950"
              >
                {result.text}
              </pre>
            </div>
            <p data-testid="applied-rules" className="hidden">
              {result.applied.join(',')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              规则纠错非 AI：上下文相关的误识处理不了，重要文本请人工复核。
            </p>
          </div>
        )
      }}
      toText={(input, options) => {
        try {
          return postProcess(input.text, optionsSchema.parse(options)).text
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}
