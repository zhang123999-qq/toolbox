import { useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { castVote, computeResult, createVotes, parseCandidates, transform } from './utils'
import type { VotingInput, VotingOptions } from './schema'

/** 示例：3 个选项的投票 */
const EXAMPLE: VotingInput = { text: '看电影\n吃火锅\n去爬山' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const t = useTranslate()
  // 票仓只保存在组件本地 state：无后端，刷新页面即丢失（页面文案已明示）
  const [votes, setVotes] = useState<readonly number[] | null>(null)
  // 复制 / 下载时需要当前票仓：toText 只收到 (input, options)，故用 ref 镜像
  const votesRef = useRef<readonly number[] | null>(null)

  function updateVotes(next: readonly number[] | null) {
    votesRef.current = next
    setVotes(next)
  }

  function renderResult(input: VotingInput, options: VotingOptions) {
    let candidates: string[]
    try {
      candidates = parseCandidates(input.text)
    } catch (error) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {error instanceof Error ? error.message : String(error)}
        </p>
      )
    }
    if (candidates.length === 0) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>

    // 选项变化导致票仓过期 → 视为未开始，引导重新开始（渲染期不做 setState）
    const activeVotes = votes !== null && votes.length === candidates.length ? votes : null
    if (activeVotes === null) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('voting.idle')}</p>
          <button
            type="button"
            data-testid="start-vote"
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => updateVotes(createVotes(candidates.length))}
          >
            {t('voting.start')}
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('voting.notice')}</p>
        </div>
      )
    }

    const result = computeResult(input, options, activeVotes)
    if (result === null) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>

    return (
      <div>
        <ol className="space-y-3">
          {result.rows.map((row, index) => (
            <li
              key={index}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {row.label}
                </span>
                <button
                  type="button"
                  data-testid={'vote-' + index}
                  className="shrink-0 rounded bg-brand px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                  onClick={() => updateVotes(castVote(activeVotes, index))}
                >
                  {t('voting.vote')}
                </button>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"
                role="progressbar"
                aria-valuenow={row.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={row.label}
              >
                <div
                  className="h-full rounded bg-brand transition-all"
                  style={{ width: `${Math.min(row.percent, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {row.votes}
                {t('voting.votes')} · {row.percent}%
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('voting.total')}：<span className="font-semibold tabular-nums">{result.total}</span>
          </p>
          <button
            type="button"
            data-testid="reset-votes"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => updateVotes(createVotes(candidates.length))}
          >
            {t('voting.reset')}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{t('voting.notice')}</p>
      </div>
    )
  }

  return (
    <MultiPanel<VotingInput, VotingOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, votesRef.current, t)}
      downloadExt="txt"
    />
  )
}
