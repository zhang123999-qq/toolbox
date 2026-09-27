import { add, det, format, inv, matrix, multiply, subtract, transpose } from 'mathjs'
import type { MatrixInput, MatrixOptions } from './schema'
import { OPERATION_LABELS } from './schema'

const MAX_DIM = 20

/**
 * 解析矩阵文本。
 * 行分隔：换行或 `;`；列分隔：空格 / 逗号 / 制表符。
 * 也接受 `[[1,2],[3,4]]` 这类 JSON 形式。
 */
export function parseMatrix(text: string): number[][] {
  const t = text.trim()
  if (t === '') throw new Error('矩阵不能为空')
  if (t.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(t)
      if (!Array.isArray(parsed) || parsed.length === 0 || !Array.isArray(parsed[0])) {
        throw new Error('bad')
      }
      return toNumberGrid(parsed as unknown[][])
    } catch {
      throw new Error('矩阵格式无法解析：请用「每行一排、空格分隔」或 JSON 数组形式')
    }
  }
  const rows = t
    .split(/[\n;]+/)
    .map((r) => r.trim())
    .filter((r) => r !== '')
  if (rows.length === 0) throw new Error('矩阵不能为空')
  const grid: number[][] = rows.map((row) => {
    const cells = row.split(/[\s,]+/).filter((c) => c !== '')
    if (cells.length === 0) throw new Error('矩阵存在空行')
    return cells.map((c) => {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(c)) {
        throw new Error('矩阵元素不是数字：' + c)
      }
      const n = Number(c)
      if (!Number.isFinite(n)) throw new Error('矩阵元素不是有限数字：' + c)
      return n
    })
  })
  return checkRect(grid)
}

function toNumberGrid(parsed: unknown[][]): number[][] {
  const grid = parsed.map((row) => {
    if (!Array.isArray(row)) throw new Error('bad')
    return row.map((cell) => {
      if (typeof cell !== 'number' || !Number.isFinite(cell)) throw new Error('bad')
      return cell
    })
  })
  return checkRect(grid)
}

function checkRect(grid: number[][]): number[][] {
  const cols = grid[0].length
  if (grid.length > MAX_DIM || cols > MAX_DIM) {
    throw new Error(`矩阵尺寸过大（上限 ${MAX_DIM}×${MAX_DIM}）`)
  }
  for (const row of grid) {
    if (row.length !== cols) throw new Error('矩阵不是矩形：各行列数不一致')
  }
  return grid
}

function fmtScalar(v: number): string {
  return format(v, { precision: 14 })
}

/** 把数值矩阵渲染为对齐文本 */
export function formatGrid(grid: number[][]): string {
  const cells = grid.map((row) => row.map((n) => fmtScalar(n)))
  const widths = cells[0].map((_, c) => Math.max(...cells.map((row) => row[c].length)))
  return cells.map((row) => row.map((s, c) => s.padStart(widths[c])).join('  ')).join('\n')
}

function requireBinary(
  a: number[][],
  bText: string,
  need?: (a: number[][], b: number[][]) => void,
): number[][] {
  if (bText.trim() === '') throw new Error('该运算需要提供矩阵 B')
  const b = parseMatrix(bText)
  if (need) need(a, b)
  return b
}

function sameShape(a: number[][], b: number[][]): void {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error(`维度不匹配：A 是 ${a.length}×${a[0].length}，B 是 ${b.length}×${b[0].length}`)
  }
}

function square(a: number[][]): void {
  if (a.length !== a[0].length) {
    throw new Error(`行列式 / 逆矩阵要求方阵，当前为 ${a.length}×${a[0].length}`)
  }
}

/** T3 同步入口（也是复制 / 下载用的纯文本） */
export function transform(input: MatrixInput, options: MatrixOptions): string {
  const aText = input.text.trim()
  if (aText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const a = parseMatrix(input.text)
  const op = options.operation
  const head = [
    `运算：${OPERATION_LABELS[op]}`,
    `矩阵 A（${a.length}×${a[0].length}）：`,
    formatGrid(a),
  ]

  switch (op) {
    case 'add':
    case 'subtract': {
      const b = requireBinary(a, input.textB, sameShape)
      const fn = op === 'add' ? add : subtract
      const result = fn(matrix(a), matrix(b)).valueOf() as number[][]
      return [
        ...head,
        `矩阵 B（${b.length}×${b[0].length}）：`,
        formatGrid(b),
        '结果：',
        formatGrid(result),
      ].join('\n')
    }
    case 'multiply': {
      const b = requireBinary(a, input.textB, (x, y) => {
        if (x[0].length !== y.length) {
          throw new Error(
            `乘法维度不匹配：A 是 ${x.length}×${x[0].length}，B 是 ${y.length}×${y[0].length}`,
          )
        }
      })
      const result = multiply(matrix(a), matrix(b)).valueOf() as number[][]
      return [
        ...head,
        `矩阵 B（${b.length}×${b[0].length}）：`,
        formatGrid(b),
        '结果：',
        formatGrid(result),
      ].join('\n')
    }
    case 'determinant': {
      square(a)
      return [...head, `行列式 det(A) = ${fmtScalar(det(matrix(a)))}`].join('\n')
    }
    case 'inverse': {
      square(a)
      let result: number[][]
      try {
        result = inv(matrix(a)).valueOf() as number[][]
      } catch {
        throw new Error('矩阵奇异（行列式为 0），不存在逆矩阵')
      }
      return [...head, '逆矩阵 A⁻¹：', formatGrid(result)].join('\n')
    }
    case 'transpose': {
      const result = transpose(matrix(a)).valueOf() as number[][]
      return [
        ...head,
        `转置 Aᵀ（${result.length}×${result[0].length}）：`,
        formatGrid(result),
      ].join('\n')
    }
  }
}
