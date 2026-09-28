import { useEffect, useRef } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { FunctionPlotInput, FunctionPlotOptions } from './schema'
import {
  mapToCanvas,
  parseFunctionExpr,
  sampleFunction,
  type PlotMapping,
} from './utils'

const CANVAS_W = 560
const CANVAS_H = 360

interface PlotView {
  error: string
  detail: string
  mapping: PlotMapping | null
}

function parseNumber(raw: string, label: string): number {
  const v = Number(raw)
  if (raw.trim() === '' || Number.isNaN(v)) throw new Error(`${label}不是有效数字`)
  return v
}

function buildView(input: FunctionPlotInput, options: FunctionPlotOptions): PlotView {
  try {
    const expr = input.text.trim() === '' ? 'x^2' : input.text.trim()
    const min = parseNumber(options.min, '最小值')
    const max = parseNumber(options.max, '最大值')
    const stepsRaw = parseNumber(options.steps, '采样点数')
    if (!Number.isInteger(stepsRaw)) throw new Error('采样点数必须为整数')
    const fn = parseFunctionExpr(expr)
    const pts = sampleFunction(fn, min, max, stepsRaw)
    const mapping = mapToCanvas(pts, CANVAS_W, CANVAS_H)
    return {
      error: '',
      detail: `y = ${expr}，x∈[${min}, ${max}]，采样 ${pts.length} 点`,
      mapping,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', detail: '', mapping: null }
  }
}

function PlotCanvas({ mapping }: { mapping: PlotMapping }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    // 坐标轴
    const xAxisY =
      mapping.yMin <= 0 && mapping.yMax >= 0
        ? CANVAS_H - 24 - ((0 - mapping.yMin) / (mapping.yMax - mapping.yMin)) * (CANVAS_H - 48)
        : CANVAS_H - 24
    const yAxisX =
      mapping.xMin <= 0 && mapping.xMax >= 0
        ? 24 + ((0 - mapping.xMin) / (mapping.xMax - mapping.xMin)) * (CANVAS_W - 48)
        : 24
    ctx.beginPath()
    ctx.moveTo(24, xAxisY)
    ctx.lineTo(CANVAS_W - 24, xAxisY)
    ctx.moveTo(yAxisX, 24)
    ctx.lineTo(yAxisX, CANVAS_H - 24)
    ctx.stroke()
    // 函数折线，NaN 处断开
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    let pen = false
    for (const p of mapping.points) {
      if (Number.isNaN(p.cy)) {
        pen = false
        continue
      }
      if (!pen) {
        ctx.moveTo(p.cx, p.cy)
        pen = true
      } else {
        ctx.lineTo(p.cx, p.cy)
      }
    }
    ctx.stroke()
  }, [mapping])
  return (
    <canvas
      ref={ref}
      width={CANVAS_W}
      height={CANVAS_H}
      data-testid="function-plot-canvas"
      className="w-full rounded border border-slate-200 dark:border-slate-700"
    />
  )
}

export default function Tool() {
  return (
    <MultiPanel<FunctionPlotInput, FunctionPlotOptions>
      meta={meta}
      initialInput={{ text: 'x^2' }}
      initialOptions={{ min: '-10', max: '10', steps: '200' }}
      example={{ text: 'sin(x)' }}
      optionDefs={[
        { key: 'min', label: '最小值', kind: 'text' },
        { key: 'max', label: '最大值', kind: 'text' },
        { key: 'steps', label: '采样点数', kind: 'text' },
      ]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="function-plot-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.detail !== '' && (
              <p data-testid="function-plot-detail" className="text-sm text-slate-700 dark:text-slate-300">
                {view.detail}
              </p>
            )}
            {view.mapping && <PlotCanvas mapping={view.mapping} />}
          </div>
        )
      }}
      toText={(input, options) => buildView(input, options).detail}
    />
  )
}
