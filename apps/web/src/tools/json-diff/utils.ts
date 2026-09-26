import { signedDiff } from '../../lib/diff'
import type { JsonDiffInput, JsonDiffOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonDiffError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonDiffError'
  }
}

/** 单侧长度上限：两侧各一份，合计可能到两倍 */
export const MAX_INPUT = 500_000

/** 缩进档位：归一化后统一用两格，避免原稿排版差异混进 diff */
const PRETTY = 2

/** 两份内容一致时的提示语 */
const SAME = '两份 JSON 内容相同'

/** 递归按键名排序，用于 sortKeys 归一化 */
function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (typeof value !== 'object' || value === null) return value
  const source = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) sorted[key] = sortValue(source[key])
  return sorted
}

/**
 * 归一化：先解析（顺带把非法 JSON 拦下），再按统一的缩进重排。
 *
 * 直接对原文做 diff 会把「缩进从两格改成四格」也算成改动；
 * 先过一遍 JSON.parse + 统一排版，diff 里剩下的才是真正的字段差异。
 */
function normalize(text: string, sortKeys: boolean, side: '左' | '右'): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new JsonDiffError(`${side}侧不是合法的 JSON`)
  }
  return JSON.stringify(sortKeys ? sortValue(parsed) : parsed, null, PRETTY)
}

/**
 * 两份 JSON 的差异对比 —— 纯函数，不依赖 React / DOM。
 *
 * 渲染复用 `lib/diff`（与 #35 文本 Diff 同一套 +/- 标记口径），
 * 本工具只负责「把 JSON 归一化成可比对的文本」这一步。
 */
export function transform(input: JsonDiffInput, options: JsonDiffOptions): string {
  if (!input.text.trim() && !input.textB.trim()) return ''

  if (input.text.length > MAX_INPUT || input.textB.length > MAX_INPUT) {
    throw new JsonDiffError(`单侧输入超过 ${MAX_INPUT} 字符上限`)
  }
  // 只有一侧有内容时无从对比，明确报错好过把整份当成新增
  if (!input.text.trim()) throw new JsonDiffError('改动前的 JSON 为空，请先在左栏填写')
  if (!input.textB.trim()) throw new JsonDiffError('改动后的 JSON 为空，请先在右栏填写')

  const before = normalize(input.text, options.sortKeys, '左')
  const after = normalize(input.textB, options.sortKeys, '右')
  if (before === after) return SAME

  return signedDiff(before, after, options.mode)
}
