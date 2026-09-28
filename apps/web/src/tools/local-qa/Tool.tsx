import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { LocalQaFormOptions, LocalQaInput } from './schema'
import { answerQuestion } from './utils'
import type { QaResult } from './utils'

interface LocalQaInputWithDocs extends LocalQaInput {
  docs?: string
}

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '问答失败，请重试'
}

function computeAnswer(
  input: LocalQaInputWithDocs,
  options: LocalQaFormOptions,
): { ok: true; result: QaResult } | { ok: false; message: string } {
  try {
    const { topK } = optionsSchema.parse({ topK: options.topK })
    return { ok: true, result: answerQuestion(input.docs ?? '', input.text, topK) }
  } catch (err) {
    return { ok: false, message: toChineseError(err) }
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<LocalQaFormOptions>[] = [
    { key: 'topK', label: '证据句数', kind: 'select', values: [1, 3, 5] },
  ]
  const extraInputs: readonly ExtraInputDef[] = [
    { key: 'docs', label: '知识文档（多篇文档之间用空行分隔）', rows: 10 },
  ]

  return (
    <MultiPanel<LocalQaInputWithDocs, LocalQaFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ topK: '3' }}
      optionDefs={optionDefs}
      extraInputs={extraInputs}
      example={{
        text: '复利的计算公式是什么？',
        docs: '复利是指利息也产生利息的计息方式。\n\n复利计算公式为：本息和 = 本金 × (1 + 利率)^期数。\n\n单利只对本金计息，利息不再产生利息。',
      }}
      renderOutput={(input, options) => {
        if (input.text.trim() === '' || (input.docs ?? '').trim() === '') {
          return (
            <p className="text-sm text-slate-500">
              在「知识文档」中粘贴文档（多篇用空行分隔），左侧输入问题后自动作答。
            </p>
          )
        }
        const view = computeAnswer(input, options)
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
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">回答</p>
              <p
                data-testid="answer"
                className="whitespace-pre-wrap rounded border border-slate-200 p-2 text-sm dark:border-slate-700"
              >
                {result.answer}
              </p>
            </div>
            {result.found ? (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  证据（按相关度排序）
                </p>
                <ol className="flex flex-col gap-1">
                  {result.evidence.map((e, i) => (
                    <li
                      key={i}
                      data-testid="evidence"
                      className="rounded bg-slate-100 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      [文档 {e.docIndex + 1} · 相关度 {e.score.toFixed(3)}] {e.sentence}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        )
      }}
      toText={(input, options) => {
        const view = computeAnswer(input, options)
        return view.ok ? view.result.answer : ''
      }}
      downloadExt="txt"
    />
  )
}
