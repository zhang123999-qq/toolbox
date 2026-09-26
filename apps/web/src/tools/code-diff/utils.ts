import { diffChars, diffLines } from 'diff'
import type { CodeDiffInput, CodeDiffOptions } from './schema'

/** 对比粒度 */
export type DiffMode = 'line' | 'char'

interface Op {
  readonly sign: ' ' | '-' | '+'
  readonly text: string
}

/** 行级：把 jsdiff 的结果展开成逐行操作序列 */
function lineOps(oldText: string, newText: string): Op[] {
  const changes = diffLines(oldText, newText)
  const ops: Op[] = []
  for (const c of changes) {
    const sign: Op['sign'] = c.added ? '+' : c.removed ? '-' : ' '
    let v = c.value
    if (v.endsWith('\n')) v = v.slice(0, -1)
    for (const line of v.split('\n')) ops.push({ sign, text: line })
  }
  return ops
}

/** 行级 unified diff：带 ---/+++ 头与 @@ hunk，上下文保留 3 行 */
export function unifiedDiff(oldText: string, newText: string): string {
  const ops = lineOps(oldText, newText)
  const changedIdx = ops.map((o, i) => (o.sign !== ' ' ? i : -1)).filter((i) => i >= 0)
  if (changedIdx.length === 0) return '(两段代码完全相同)'

  // 预计算每行在旧/新文件里的行号
  const oldNo: number[] = []
  const newNo: number[] = []
  let ol = 1
  let nl = 1
  for (const o of ops) {
    oldNo.push(o.sign === '+' ? -1 : ol)
    newNo.push(o.sign === '-' ? -1 : nl)
    if (o.sign !== '+') ol++
    if (o.sign !== '-') nl++
  }

  // 合并带 3 行上下文的 hunk 区间
  const spans: Array<[number, number]> = []
  for (const i of changedIdx) {
    const s = Math.max(0, i - 3)
    const e = Math.min(ops.length - 1, i + 3)
    const last = spans[spans.length - 1]
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e)
    else spans.push([s, e])
  }

  const out: string[] = ['--- 旧版 (a)', '+++ 新版 (b)']
  for (const [s, e] of spans) {
    let oldCount = 0
    let newCount = 0
    for (let i = s; i <= e; i++) {
      if (ops[i].sign !== '+') oldCount++
      if (ops[i].sign !== '-') newCount++
    }
    const oldStart = oldNo[s] === -1 ? 0 : oldNo[s]
    const newStart = newNo[s] === -1 ? 0 : newNo[s]
    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
    for (let i = s; i <= e; i++) out.push(ops[i].sign + ' ' + ops[i].text)
  }
  return out.join('\n')
}

/** 字符级：直接输出带符号的字符片段流 */
export function charDiff(oldText: string, newText: string): string {
  const changes = diffChars(oldText, newText)
  const hasDiff = changes.some((c) => c.added || c.removed)
  if (!hasDiff) return '(两段代码完全相同)'
  const out: string[] = ['--- 旧版 (a)', '+++ 新版 (b)']
  for (const c of changes) {
    if (!c.value) continue
    const sign = c.added ? '+' : c.removed ? '-' : ' '
    out.push(sign + ' ' + c.value)
  }
  return out.join('\n')
}

/** 校验模式 */
export function assertMode(mode: string): void {
  if (mode !== 'line' && mode !== 'char') throw new Error('不支持的模式：' + mode)
}

/** 主转换：两边都空返回空串；模式非法抛中文错误 */
export function transform(input: CodeDiffInput, options: CodeDiffOptions): string {
  if (input.text === '' && input.textB === '') return ''
  if (input.text.length > 200000 || input.textB.length > 200000) {
    throw new Error('输入超过 200,000 字符上限')
  }
  assertMode(options.mode)
  return options.mode === 'char'
    ? charDiff(input.text, input.textB)
    : unifiedDiff(input.text, input.textB)
}
