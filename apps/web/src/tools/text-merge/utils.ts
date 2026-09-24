import { diffArrays } from 'diff'
import type { TextMergeInput, TextMergeOptions } from './schema'

/** base → other 的一处编辑：从 start 起去掉 removed 行，换成 inserted */
export interface Edit {
  readonly start: number
  readonly removed: number
  readonly inserted: readonly string[]
}

/** 把 base→other 的差异整理成按 base 行号索引的编辑列表 */
export function editsOf(base: readonly string[], other: readonly string[]): Edit[] {
  const edits: Array<{ start: number; removed: number; inserted: string[] }> = []
  let index = 0
  let pending: { start: number; removed: number; inserted: string[] } | null = null
  for (const change of diffArrays([...base], [...other])) {
    if (change.added) {
      if (!pending) pending = { start: index, removed: 0, inserted: [] }
      pending.inserted.push(...change.value)
      continue
    }
    if (change.removed) {
      if (!pending) pending = { start: index, removed: 0, inserted: [] }
      pending.removed += change.value.length
      index += change.value.length
      continue
    }
    // 公共段：先把挂着的编辑收掉
    if (pending) {
      edits.push(pending)
      pending = null
    }
    index += change.value.length
  }
  if (pending) edits.push(pending)
  return edits
}

/** 某一侧相对 base 的计划：repl 是按行的替换（null 未动、[] 删除），ins 是行间插入 */
interface Plan {
  readonly repl: ReadonlyArray<readonly string[] | null>
  readonly ins: ReadonlyArray<readonly string[]>
}

/**
 * 把编辑列表摊成逐行 / 逐间隙的结构：
 *  - 纯插入挂在「第 i 行之前」的间隙上（i = base.length 表示末尾追加）
 *  - 替换 / 删除挂在起始行上，被吃掉的后继行标记为删除
 * 这样「一侧插入、另一侧改这一行」就不会被误判成冲突。
 */
export function planOf(base: readonly string[], edits: readonly Edit[]): Plan {
  const repl: Array<readonly string[] | null> = new Array(base.length).fill(null)
  const ins: string[][] = Array.from({ length: base.length + 1 }, () => [])
  for (const edit of edits) {
    if (edit.removed === 0) {
      ins[Math.min(edit.start, base.length)].push(...edit.inserted)
      continue
    }
    repl[edit.start] = [...edit.inserted]
    for (let k = edit.start + 1; k < Math.min(edit.start + edit.removed, base.length); k += 1) {
      repl[k] = []
    }
  }
  return { repl, ins }
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, index) => line === b[index])
}

/** 两侧都改了：按偏好决定是标冲突还是直接取一方 */
function pick(
  prefer: TextMergeOptions['prefer'],
  minePart: readonly string[],
  theirsPart: readonly string[],
): string[] {
  if (prefer === 'mine') return [...minePart]
  if (prefer === 'theirs') return [...theirsPart]
  return ['<<<<<<< 我的版本', ...minePart, '=======', ...theirsPart, '>>>>>>> 他人版本']
}

/** 合并结果：conflict 为真表示双方改到了同一处 */
export interface MergeResult {
  readonly text: string
  readonly conflict: boolean
}

/**
 * 逐行三方合并（diff3 的简化版）：
 * 以 base 为共同祖先，把两侧各自的「编辑区间」对齐后逐段决策——
 * 只有一方改了就采纳，两边改得一样就采纳一次，改得不一样才判冲突。
 */
export function mergeLines(
  base: readonly string[],
  mine: readonly string[],
  theirs: readonly string[],
  prefer: TextMergeOptions['prefer'],
): MergeResult {
  const minePlan = planOf(base, editsOf(base, mine))
  const theirsPlan = planOf(base, editsOf(base, theirs))
  const lines: string[] = []
  let conflict = false

  // 间隙（含末尾）与行交替处理：先落这一行之前的插入，再决定这一行本身
  for (let index = 0; index <= base.length; index += 1) {
    const mineIns = minePlan.ins[index]
    const theirsIns = theirsPlan.ins[index]
    if (mineIns.length > 0 || theirsIns.length > 0) {
      if (same(mineIns, theirsIns)) lines.push(...mineIns)
      else if (mineIns.length === 0) lines.push(...theirsIns)
      else if (theirsIns.length === 0) lines.push(...mineIns)
      else {
        conflict = true
        lines.push(...pick(prefer, mineIns, theirsIns))
      }
    }
    if (index === base.length) break

    const mineRepl = minePlan.repl[index]
    const theirsRepl = theirsPlan.repl[index]
    if (mineRepl !== null && theirsRepl !== null) {
      // 两侧都动了这一行：改得一样就采纳一次，否则冲突
      if (same(mineRepl, theirsRepl)) {
        lines.push(...mineRepl)
        continue
      }
      conflict = true
      lines.push(...pick(prefer, mineRepl, theirsRepl))
      continue
    }
    if (mineRepl !== null) {
      lines.push(...mineRepl)
      continue
    }
    if (theirsRepl !== null) {
      lines.push(...theirsRepl)
      continue
    }
    lines.push(base[index])
  }
  return { text: lines.join('\n'), conflict }
}

/** 字符串版：按行切分后调 mergeLines，输出统一用 LF */
export function mergeText(
  base: string,
  mine: string,
  theirs: string,
  prefer: TextMergeOptions['prefer'],
): MergeResult {
  return mergeLines(base.split(/\r?\n/), mine.split(/\r?\n/), theirs.split(/\r?\n/), prefer)
}

/** 合并三段文本；有冲突时在末尾附一行说明 */
export function transform(input: TextMergeInput, options: TextMergeOptions): string {
  const result = mergeText(input.text, input.textB, input.textC, options.prefer)
  if (!result.conflict) return result.text
  if (options.prefer === 'auto') {
    return result.text + '\n\n注意：双方修改了同一处，已用冲突标记标出，请人工确认。'
  }
  return (
    result.text +
    '\n\n注意：双方修改了同一处，已按「优先取' +
    (options.prefer === 'mine' ? '我的版本' : '他人版本') +
    '」处理，另一方的改动被丢弃。'
  )
}
