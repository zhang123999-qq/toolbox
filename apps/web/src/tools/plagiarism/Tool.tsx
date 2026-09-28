import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { PlagiarismInput, PlagiarismOptions } from './schema'
import {
  DEFAULT_THRESHOLD,
  THRESHOLDS,
  buildReport,
  compareAll,
  formatPercent,
  parseThreshold,
  similarityLevel,
  validateDoc,
} from './utils'
import type { DocInput, PairDetail } from './utils'

/** 纯本地计算，无网络请求 */
export default function Tool() {
  const [pairs, setPairs] = useState<readonly PairDetail[] | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '比对失败，请重试'
  }

  /** 收集非空文档并校验 */
  function collectDocs(input: PlagiarismInput): DocInput[] {
    const raw: Array<[string, string | undefined]> = [
      ['文档A', input.text],
      ['文档B', input.docB],
      ['文档C', input.docC],
    ]
    const docs: DocInput[] = []
    for (const [name, text] of raw) {
      if (text === undefined || text.trim() === '') continue
      docs.push({ name, text: validateDoc(name, text) })
    }
    return docs
  }

  async function handleCheck(input: PlagiarismInput, options: PlagiarismOptions): Promise<void> {
    setError('')
    setPairs(null)
    let docs: DocInput[]
    let threshold: number
    try {
      docs = collectDocs(input)
      threshold = parseThreshold(optionsSchema.parse(options).threshold)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      // 大文档计算可能耗时，让出 UI 线程再算
      await new Promise((r) => setTimeout(r, 0))
      setPairs(compareAll(docs, threshold))
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<PlagiarismInput, PlagiarismOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ threshold: DEFAULT_THRESHOLD }}
      optionDefs={[{ key: 'threshold', label: '相似度阈值', kind: 'select', values: THRESHOLDS }]}
      extraInputs={[
        { key: 'docB', label: '文档 B', rows: 6 },
        { key: 'docC', label: '文档 C（可选）', rows: 6 },
      ]}
      example={{
        text: '人工智能是计算机科学的一个分支，它研究如何让机器模拟人类智能。机器学习是实现人工智能的重要方法，近年来取得了巨大进展。',
        docB: '人工智能是计算机科学的一个分支，它研究如何让机器模拟人类智能。深度学习作为机器学习的子领域，近年来取得了突破性进展。',
      }}
      renderOutput={(input, options) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="check"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleCheck(input, options)}
            >
              {pending ? '比对中…' : '开始比对'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            在左侧粘贴 2~3 篇文档（每篇至少 20
            字符），点「开始比对」。只做文档之间的两两比对，不做全网查重；全部计算在本地完成。
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
          {pairs ? (
            <div data-testid="result" className="flex flex-col gap-3">
              {pairs.map((p, i) => (
                <div key={i} className="rounded border border-slate-200 p-2 dark:border-slate-700">
                  <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {p.a} × {p.b}：{formatPercent(p.score)}
                    <span className="ml-2 text-xs text-slate-500">
                      （{similarityLevel(p.score)}）
                    </span>
                  </p>
                  {p.similar.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {p.similar.map((s, j) => (
                        <li
                          key={j}
                          className="rounded bg-amber-50 p-1 text-sm text-slate-700 dark:bg-amber-950 dark:text-slate-300"
                        >
                          <span className="mr-1 font-mono text-xs text-amber-700 dark:text-amber-400">
                            [{formatPercent(s.score)}]
                          </span>
                          {s.sentence}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">无达到阈值的相似片段</p>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
      toText={() => (pairs === null ? '' : buildReport(pairs))}
      downloadExt="md"
    />
  )
}
