import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { VotingInput, VotingOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 百分比保留 1 位小数：先按千分比取整再除以 10 */
const PERCENT_PRECISION = 10
const PERCENT_BASE = 100

type MessageParams = Record<string, string | number>

/** `{name}` 占位符替换（与 i18n.createTranslator 同规则的轻量实现） */
function fill(template: string, params?: MessageParams): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  )
}

/** 双语错误（中文 / English）：文案全部取自 i18n 词典，无硬编码 */
export function bilingualError(key: MessageKey, params?: MessageParams): Error {
  return new Error(fill(zh[key], params) + ' / ' + fill(en[key], params))
}

/**
 * 候选项解析：按行切分，去首尾空白，丢弃空行。
 * 空列表 → 返回 []（上层按空态处理）；只有 1 个 → 报错。
 */
export function parseCandidates(text: string): string[] {
  const candidates = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  if (candidates.length === 1) throw bilingualError('voting.error.tooFew')
  return candidates
}

/** 新建票仓：n 个候选项，票数全 0（返回新数组，调用方可直接 setState） */
export function createVotes(candidateCount: number): number[] {
  return new Array<number>(candidateCount).fill(0)
}

/**
 * 投一票（纯函数，返回新数组，不修改入参）。
 * 序号越界 → 抛双语错误。
 */
export function castVote(votes: readonly number[], index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= votes.length) {
    throw bilingualError('voting.error.badIndex', { index })
  }
  const next = votes.slice()
  next[index] += 1
  return next
}

/** 总票数 */
export function totalVotes(votes: readonly number[]): number {
  return votes.reduce((sum, v) => sum + v, 0)
}

export interface TallyRow {
  readonly label: string
  readonly votes: number
  /** 得票占比（0–100，保留 1 位小数）；总票数为 0 时为 0 */
  readonly percent: number
}

/** 计票：按候选项顺序返回票数与占比 */
export function tally(candidates: readonly string[], votes: readonly number[]): TallyRow[] {
  const total = totalVotes(votes)
  return candidates.map((label, index) => ({
    label,
    votes: votes[index],
    percent:
      total === 0
        ? 0
        : Math.round((votes[index] / total) * PERCENT_BASE * PERCENT_PRECISION) / PERCENT_PRECISION,
  }))
}

export interface VotingResult {
  readonly candidates: readonly string[]
  readonly votes: readonly number[]
  readonly rows: readonly TallyRow[]
  readonly total: number
}

/**
 * 投票结果计算：选项留空返回 null（上层渲染空态，不报错）；
 * 票仓长度与候选项不一致 → 视为过期票仓，返回 null（上层引导重新开始）。
 */
export function computeResult(
  input: VotingInput,
  options: VotingOptions,
  votes: readonly number[] | null,
): VotingResult | null {
  const parsedInput = inputSchema.parse(input)
  optionsSchema.parse(options)
  const candidates = parseCandidates(parsedInput.text)
  if (candidates.length === 0) return null
  if (votes === null || votes.length !== candidates.length) return null
  return { candidates, votes, rows: tally(candidates, votes), total: totalVotes(votes) }
}

/** 纯文本版本（复制 / 下载用）；未开始或选项留空 → 空串 */
export function transform(
  input: VotingInput,
  options: VotingOptions,
  votes: readonly number[] | null,
  t: Translate,
): string {
  const result = computeResult(input, options, votes)
  if (result === null) return ''
  const lines = [
    `${t('voting.total')}：${result.total}`,
    `${t('voting.result')}：`,
    ...result.rows.map(
      (row, index) =>
        `${index + 1}. ${row.label}：${row.votes}${t('voting.votes')}（${row.percent}%）`,
    ),
  ]
  return lines.join('\n')
}
