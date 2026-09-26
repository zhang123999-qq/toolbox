import type { BezierEditorInput, BezierEditorOptions } from './schema'

const MAX_INPUT = 200_000

/** 解析控制点：x 必须在 [0,1]，y 允许 [-1,2]（CSS 允许 y 超出） */
export function parseControl(value: string, name: string, range: [number, number]): number {
  const trimmed = value.trim()
  const n = Number(trimmed)
  if (Number.isNaN(n)) throw new Error(`${name} 格式非法：请输入数字`)
  if (n < range[0] || n > range[1]) {
    throw new Error(`${name} 超出范围：应在 ${range[0]} 到 ${range[1]} 之间`)
  }
  return n
}

/**
 * 三次贝塞尔：P0=(0,0) P1=(x1,y1) P2=(x2,y2) P3=(1,1)
 * B(t) = 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
 */
export function bezierPoint(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): {
  readonly x: number
  readonly y: number
} {
  const u = 1 - t
  const a = 3 * u * u * t
  const b = 3 * u * t * t
  const c = t * t * t
  return {
    x: a * x1 + b * x2 + c,
    y: a * y1 + b * y2 + c,
  }
}

export function buildBezier(options: BezierEditorOptions): string {
  const x1 = parseControl(options.x1, 'x1', [0, 1])
  const y1 = parseControl(options.y1, 'y1', [-1, 2])
  const x2 = parseControl(options.x2, 'x2', [0, 1])
  const y2 = parseControl(options.y2, 'y2', [-1, 2])

  const round = (n: number) => Math.round(n * 1000) / 1000
  const cb = `cubic-bezier(${round(x1)}, ${round(y1)}, ${round(x2)}, ${round(y2)})`

  const samples = [0.25, 0.5, 0.75].map((t) => {
    const p = bezierPoint(t, x1, y1, x2, y2)
    return `  t=${t.toFixed(2)} → (${round(p.x)}, ${round(p.y)})`
  })

  return [cb, '', '/* 曲线上的采样点（t 为参数，非时间轴） */', ...samples].join('\n')
}

export function transform(input: BezierEditorInput, options: BezierEditorOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildBezier(options)
}
