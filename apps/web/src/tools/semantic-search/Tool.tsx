import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { inputSchema } from './schema'
import type { SemanticSearchFormOptions, SemanticSearchInput } from './schema'
import { formatScore, rankDocuments, splitDocuments } from './utils'
import type { RankedDoc } from './utils'

const EXAMPLE_DOCS = `苹果公司推出了新款手机，摄像头和芯片都有大幅升级。
香蕉是一种热带水果，富含钾元素，对心脏健康有益。
新款手机的电池续航提升了两小时，充电速度也更快。
香蕉和苹果都是常见的水果，营养价值各不相同。`

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '处理失败，请重试'
}

export default function Tool() {
  const [results, setResults] = useState<RankedDoc[]>([])
  const [error, setError] = useState('')
  const [ran, setRan] = useState(false)

  /** 纯本地 TF-IDF 检索：文档库按行切分，与查询做余弦相似度排序 */
  function handleSearch(input: SemanticSearchInput): void {
    setError('')
    setResults([])
    try {
      const parsed = inputSchema.parse(input)
      const docs = splitDocuments(parsed.text)
      const ranked = rankDocuments(docs, parsed.query)
      setResults(ranked)
    } catch (err) {
      setResults([])
      setError(toChineseError(err))
    } finally {
      setRan(true)
    }
  }

  return (
    <MultiPanel<SemanticSearchInput, SemanticSearchFormOptions>
      meta={meta}
      initialInput={{ text: '', query: '' }}
      initialOptions={{}}
      example={{ text: EXAMPLE_DOCS, query: '手机新品' }}
      extraInputs={[{ key: 'query', label: '查询语句', rows: 2 }]}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="search"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
              onClick={() => handleSearch(input)}
            >
              搜索
            </button>
            <p className="text-xs text-slate-500">
              纯本地计算：TF-IDF + 余弦相似度，不联网。文档与查询都不能为空。
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}

          {results.length > 0 ? (
            <ol data-testid="results" className="flex flex-col gap-2">
              {results.map((r, i) => (
                <li
                  key={r.index}
                  data-testid={`result-${i}`}
                  className="rounded border border-slate-200 p-2 text-sm dark:border-slate-700"
                >
                  <p className="text-xs text-slate-500">
                    排名 {i + 1} · 文档 #{r.index + 1} · 相似度 {formatScore(r.score)}
                  </p>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">{r.text}</p>
                </li>
              ))}
            </ol>
          ) : null}

          {ran && results.length === 0 && !error ? (
            <p className="text-sm text-slate-500">没有可排序的文档（文档库为空）。</p>
          ) : null}

          {!ran && !error ? (
            <p className="text-sm text-slate-500">
              这是一个词袋模型的演示：英文按词切分、中文按单字 + 二元词切分，
              不具备真正的语义理解能力，措辞相近但含义不同的文档也可能排在前面。
            </p>
          ) : null}
        </div>
      )}
      toText={() => results.map((r) => `${formatScore(r.score)}\t${r.text}`).join('\n')}
      downloadExt="txt"
    />
  )
}
