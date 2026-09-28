import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { RagFormOptions, RagInput } from './schema'
import { answerQuestion } from './utils'

/** 得分 → 保留 4 位小数（展示用，与 semantic-search 的 formatScore 一致） */
function formatScore(score: number): string {
  return score.toFixed(4)
}

const EXAMPLE_TEXT = `TF-IDF 是一种常用的文本检索算法。它的全称是词频 - 逆文档频率。
词频（TF）衡量一个词在文档中出现的频率，逆文档频率（IDF）衡量一个词的稀缺程度。
RAG 是检索增强生成的缩写，它把检索到的相关片段拼进提示词，再交给大语言模型作答。
余弦相似度用于比较两个向量的夹角，夹角越小表示两个文本越相似。
本工具是 RAG 的纯本地演示：只有 TF-IDF 检索，没有大语言模型，答案是关键词句抽取拼接而成。`

interface AnswerView {
  answer: string
  chunks: readonly { text: string; score: number }[]
}

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '处理失败，请重试'
}

export default function Tool() {
  const [view, setView] = useState<AnswerView | null>(null)
  const [error, setError] = useState('')
  const [kValue, setKValue] = useState('3')

  /** 纯本地问答：TF-IDF 检索 top-k 片段，再抽取关键词句拼成答案（无 LLM） */
  function handleAsk(input: RagInput): void {
    setError('')
    setView(null)
    try {
      const opts = optionsSchema.parse({ k: kValue })
      const out = answerQuestion(input.text, input.query, opts.k)
      setView({ answer: out.answer, chunks: out.chunks })
    } catch (err) {
      setView(null)
      setError(toChineseError(err))
    }
  }

  return (
    <MultiPanel<RagInput, RagFormOptions>
      meta={meta}
      initialInput={{ text: '', query: '' }}
      initialOptions={{ k: '3' }}
      example={{ text: EXAMPLE_TEXT, query: 'TF-IDF 是什么' }}
      extraInputs={[{ key: 'query', label: '问题', rows: 2 }]}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              检索片段数
              <input
                type="text"
                inputMode="numeric"
                data-testid="k-input"
                className="w-14 rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                value={kValue}
                onChange={(e) => setKValue(e.target.value)}
              />
            </label>
            <button
              type="button"
              data-testid="ask"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
              onClick={() => handleAsk(input)}
            >
              提问
            </button>
            <p className="text-xs text-slate-500">
              纯本地计算，不联网、无大语言模型。文档内容与问题都不能为空。
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

          {view ? (
            <div className="flex flex-col gap-3">
              <div className="rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs text-slate-500">答案（原句抽取拼接，非模型生成）：</p>
                <p
                  data-testid="answer"
                  className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
                >
                  {view.answer}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">命中的文档片段（按相似度排序）：</p>
                <ol data-testid="chunks" className="flex flex-col gap-2">
                  {view.chunks.map((c, i) => (
                    <li
                      key={i}
                      data-testid={`chunk-${i}`}
                      className="rounded border border-slate-200 p-2 text-sm dark:border-slate-700"
                    >
                      <p className="text-xs text-slate-500">
                        片段 {i + 1} · 相似度 {formatScore(c.score)}
                      </p>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">{c.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : null}

          {!view && !error ? (
            <p className="text-sm text-slate-500">
              工作流程：先把文档切成滑窗片段 → TF-IDF + 余弦相似度检索最相关的{' '}
              {kValue.trim() === '' ? '3' : kValue} 个片段 → 从片段中抽取含关键词的句子拼成答案。
              <br />
              注意：答案只是原文句子的抽取与拼接，不是生成式回答；中文用单字 + 二元词切分，
              查询中的单字可能误命中无关词。
            </p>
          ) : null}
        </div>
      )}
      toText={() => (view ? view.answer : '')}
      downloadExt="txt"
    />
  )
}
