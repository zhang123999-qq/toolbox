import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { EmbeddingFormOptions, EmbeddingInput } from './schema'
import { EMBED_DIMS, cosineSimilarity, embedText, formatVector } from './utils'

interface EmbeddingInputWithB extends EmbeddingInput {
  textB?: string
}

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '计算失败，请重试'
}

/** 计算视图模型：成功返回向量与相似度，失败返回中文错误 */
function computeView(
  input: EmbeddingInputWithB,
  options: EmbeddingFormOptions,
): { ok: true; vecA: number[]; sim: number | null } | { ok: false; message: string } {
  try {
    const parsed = optionsSchema.parse({ dim: options.dim })
    const vecA = embedText(input.text, parsed.dim)
    const textB = (input.textB ?? '').trim()
    if (textB === '') return { ok: true, vecA, sim: null }
    return { ok: true, vecA, sim: cosineSimilarity(vecA, embedText(textB, parsed.dim)) }
  } catch (err) {
    return { ok: false, message: toChineseError(err) }
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<EmbeddingFormOptions>[] = [
    { key: 'dim', label: '维度', kind: 'select', values: [...EMBED_DIMS] },
  ]
  const extraInputs: readonly ExtraInputDef[] = [
    { key: 'textB', label: '文本 B（对比相似度，可空）', rows: 4 },
  ]

  return (
    <MultiPanel<EmbeddingInputWithB, EmbeddingFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ dim: '256' }}
      optionDefs={optionDefs}
      extraInputs={extraInputs}
      example={{ text: '今天天气不错，适合出去散步。' }}
      renderOutput={(input, options) => {
        if (input.text.trim() === '') {
          return <p className="text-sm text-slate-500">左侧输入文本后自动计算嵌入向量。</p>
        }
        const view = computeView(input, options)
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
        return (
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                文本 A 的嵌入向量（已 L2 归一化）
              </p>
              <pre
                data-testid="vector-preview"
                className="whitespace-pre-wrap break-all rounded border border-slate-200 p-2 font-mono text-xs dark:border-slate-700"
              >
                {formatVector(view.vecA)}
              </pre>
            </div>
            {view.sim !== null ? (
              <p data-testid="similarity" className="text-sm text-slate-700 dark:text-slate-300">
                A 与 B 的余弦相似度：<strong>{view.sim.toFixed(4)}</strong>
                <span className="text-xs text-slate-500">
                  （特征哈希为词袋统计，数值仅反映用词重叠）
                </span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                在「文本 B」中输入第二段文本可计算余弦相似度。
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => {
        const view = computeView(input, options)
        return view.ok ? formatVector(view.vecA, view.vecA.length) : ''
      }}
      downloadExt="txt"
    />
  )
}
