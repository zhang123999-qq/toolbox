/**
 * embedding-vis —— 嵌入可视化的纯函数层
 *
 * 流程：文本 → 特征哈希向量（与 #596 同算法，此处自包含一份实现）→
 * PCA（Gram 矩阵 + 幂迭代求前两个特征对）→ 2D 坐标 → echarts 散点 option。
 *
 * 本文件不触碰任何浏览器 API（echarts.init 只在 Tool.tsx 中），
 * 可在 node 下被 vitest 完整测试。
 */

/** 可选维度（与 #596 一致） */
export const EMBED_DIMS = [64, 128, 256, 512, 1024] as const

/** 输入行数上限 */
export const MAX_LINES = 200
/** 单行文本上限字符数 */
export const MAX_LINE_CHARS = 5_000

/** 带标签的文本行 */
export interface LabeledText {
  readonly label: string
  readonly text: string
}

/** 2D 散点 */
export interface Point2D {
  readonly x: number
  readonly y: number
  readonly label: string
}

// ---------------------------------------------------------------------------
// 特征哈希嵌入（与 #596 同算法，自包含）
// ---------------------------------------------------------------------------

function fnv1a32(token: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function tokenize(text: string): string[] {
  const tokens: string[] = []
  const wordRe = /[a-z0-9]+|[\u4e00-\u9fff]/g
  const lower = text.toLowerCase()
  let m: RegExpExecArray | null
  while ((m = wordRe.exec(lower)) !== null) tokens.push(m[0])
  return tokens
}

/** 文本 → dim 维归一化向量；空文本得零向量 */
export function embedText(text: string, dim: number): number[] {
  if (!Number.isInteger(dim) || !(EMBED_DIMS as readonly number[]).includes(dim)) {
    throw new Error(`维度非法：${String(dim)}（可选 ${EMBED_DIMS.join(' / ')}）`)
  }
  const vec = new Array<number>(dim).fill(0)
  for (const token of tokenize(text)) {
    const h = fnv1a32(token)
    vec[h % dim]! += h & 0x80000000 ? -1 : 1
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  return norm === 0 ? vec : vec.map((v) => v / norm)
}

// ---------------------------------------------------------------------------
// 输入解析
// ---------------------------------------------------------------------------

/**
 * 解析多行输入：每行 "标签：文本"（冒号支持中英文）；无冒号的行标签自动编号为 "文本 n"。
 * 空行忽略；无有效行 / 超行数 / 单行超长时抛中文错。
 */
export function parseLabeledLines(text: string): LabeledText[] {
  if (typeof text !== 'string') throw new Error('输入必须是文本')
  const out: LabeledText[] = []
  const lines = text.split('\n')
  let n = 0
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') continue
    n++
    if (n > MAX_LINES) throw new Error(`输入行数过多：超过 ${MAX_LINES} 行上限`)
    if (line.length > MAX_LINE_CHARS) {
      throw new Error(`第 ${n} 行过长：超过 ${MAX_LINE_CHARS} 字符`)
    }
    const sep = line.search(/[:：]/)
    if (sep < 0) {
      out.push({ label: `文本 ${n}`, text: line })
    } else {
      const label = line.slice(0, sep).trim()
      const body = line.slice(sep + 1).trim()
      if (body === '') throw new Error(`第 ${n} 行冒号后没有文本内容`)
      out.push({ label: label === '' ? `文本 ${n}` : label, text: body })
    }
  }
  if (out.length === 0) throw new Error('没有有效输入：请每行输入一条 "标签：文本"')
  return out
}

// ---------------------------------------------------------------------------
// PCA（Gram 矩阵 + 幂迭代）
// ---------------------------------------------------------------------------

const EPS = 1e-12
const MAX_ITERS = 200

function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!
  return s
}

/**
 * 对称矩阵的幂迭代：返回主特征值与单位特征向量。
 * 矩阵接近零时返回特征值 0 与零向量（退化分支）。
 */
export function powerIteration(matrix: readonly (readonly number[])[]): {
  value: number
  vector: number[]
} {
  const n = matrix.length
  if (n === 0) throw new Error('矩阵不能为空')
  for (const row of matrix) {
    if (row.length !== n) throw new Error('矩阵必须是方阵')
  }
  let v = Array.from({ length: n }, (_, i) => i + 1)
  const initNorm = Math.sqrt(dot(v, v))
  v = v.map((x) => x / initNorm)
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const w = matrix.map((row) => dot(row, v))
    const nrm = Math.sqrt(dot(w, w))
    if (nrm < EPS) return { value: 0, vector: new Array<number>(n).fill(0) }
    const next = w.map((x) => x / nrm)
    let diff = 0
    for (let i = 0; i < n; i++) diff += Math.abs(next[i]! - v[i]!)
    v = next
    if (diff < 1e-10) break
  }
  return {
    value: dot(
      v,
      matrix.map((row) => dot(row, v)),
    ),
    vector: v,
  }
}

/**
 * PCA 投影：n 个 d 维向量 → n 个 2D 点。
 * 用 Gram 矩阵 G=Xc·Xcᵀ 幂迭代求前两个特征对，样本 i 在主成分 k 上的坐标为 √λₖ·uₖ[i]。
 * 退化情形（单样本 / 零方差）对应坐标为 0。
 */
export function pcaProject(vectors: readonly (readonly number[])[]): Point2D[] {
  if (vectors.length === 0) throw new Error('向量列表不能为空')
  const d = vectors[0]!.length
  if (d === 0) throw new Error('向量维度不能为 0')
  for (const v of vectors) {
    if (v.length !== d) throw new Error('所有向量维度必须一致')
  }
  const n = vectors.length
  if (n === 1) return [{ x: 0, y: 0, label: '' }]
  // 中心化
  const mean = new Array<number>(d).fill(0)
  for (const v of vectors) for (let j = 0; j < d; j++) mean[j]! += v[j]!
  for (let j = 0; j < d; j++) mean[j]! /= n
  const centered = vectors.map((v) => v.map((x, j) => x - mean[j]!))
  // Gram 矩阵
  let gram: number[][] = centered.map((a) => centered.map((b) => dot(a, b)))
  const xs = new Array<number>(n).fill(0)
  const ys = new Array<number>(n).fill(0)
  const coords = [xs, ys]
  for (let k = 0; k < 2; k++) {
    const { value, vector } = powerIteration(gram)
    if (value > EPS) {
      const s = Math.sqrt(value)
      for (let i = 0; i < n; i++) coords[k]![i] = s * vector[i]!
      // 缩减：G -= λ·u·uᵀ
      gram = gram.map((row, i) => row.map((gij, j) => gij - value * vector[i]! * vector[j]!))
    }
  }
  return xs.map((x, i) => ({ x, y: ys[i]!, label: '' }))
}

// ---------------------------------------------------------------------------
// echarts option（纯对象，不 import echarts）
// ---------------------------------------------------------------------------

/** 由 2D 点生成 echarts 散点图 option；tooltip 悬停显示标签与原文 */
export function buildScatterOption(points: readonly Point2D[]): Record<string, unknown> {
  return {
    grid: { left: 48, right: 16, top: 16, bottom: 32 },
    tooltip: {
      trigger: 'item',
      formatter: (params: { data?: { name?: string; value?: [number, number] } }) =>
        `${params.data?.name ?? ''}`,
    },
    xAxis: { type: 'value', name: 'PC1', scale: true },
    yAxis: { type: 'value', name: 'PC2', scale: true },
    series: [
      {
        type: 'scatter',
        symbolSize: 12,
        data: points.map((p) => ({ name: p.label, value: [p.x, p.y] })),
        itemStyle: { color: '#3b82f6' },
        emphasis: { itemStyle: { color: '#ef4444' } },
      },
    ],
  }
}
