import { useEffect, useRef } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { inFinder, matrixOf, resolveOptions, toSvgText } from './utils'
import type { QrStylingInput, QrStylingOptions } from './schema'
import type { StyledOptions } from './utils'

const EXAMPLE: QrStylingInput = { text: 'https://example.com' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const HINT_CLASS = 'text-sm text-slate-500 dark:text-slate-400'
const CANVAS_PX = 320

/** 手写圆角矩形路径（避免依赖 ctx.roundRect 的环境支持差异） */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

interface CanvasProps {
  readonly size: number
  readonly data: Uint8Array
  readonly opts: StyledOptions
}

function StyledQrCanvas({ size, data, opts }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const total = size + opts.margin * 2
    const cell = W / total

    ctx.clearRect(0, 0, W, W)
    ctx.fillStyle = opts.bgColor
    ctx.fillRect(0, 0, W, W)

    ctx.fillStyle = opts.color
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!data[y * size + x] || inFinder(x, y, size)) continue
        const px = (x + opts.margin) * cell
        const py = (y + opts.margin) * cell
        if (opts.dotStyle === 'dot') {
          ctx.beginPath()
          ctx.arc(px + cell / 2, py + cell / 2, cell * 0.42, 0, Math.PI * 2)
          ctx.fill()
        } else if (opts.dotStyle === 'rounded') {
          roundRectPath(
            ctx,
            px + cell * 0.08,
            py + cell * 0.08,
            cell * 0.84,
            cell * 0.84,
            cell * 0.3,
          )
          ctx.fill()
        } else {
          ctx.fillRect(px, py, cell, cell)
        }
      }
    }

    // 三个定位角：外框圆角 + 内芯白底 + 中心黑块
    const corners: readonly [number, number][] = [
      [opts.margin, opts.margin],
      [opts.margin + size - 7, opts.margin],
      [opts.margin, opts.margin + size - 7],
    ]
    for (const [ox, oy] of corners) {
      ctx.fillStyle = opts.color
      roundRectPath(ctx, ox * cell, oy * cell, 7 * cell, 7 * cell, 1.6 * cell)
      ctx.fill()
      ctx.fillStyle = opts.bgColor
      roundRectPath(ctx, (ox + 1) * cell, (oy + 1) * cell, 5 * cell, 5 * cell, 1.1 * cell)
      ctx.fill()
      ctx.fillStyle = opts.color
      roundRectPath(ctx, (ox + 2) * cell, (oy + 2) * cell, 3 * cell, 3 * cell, 0.7 * cell)
      ctx.fill()
    }

    return () => {
      ctx.clearRect(0, 0, W, W)
    }
  }, [size, data, opts])

  return (
    <canvas
      ref={canvasRef}
      data-testid="qr-canvas"
      width={CANVAS_PX}
      height={CANVAS_PX}
      className="rounded border border-slate-300 bg-white"
    />
  )
}

export default function Tool() {
  const optionDefs: readonly OptionDef<QrStylingOptions>[] = [
    { key: 'dotStyle', label: '点样式', kind: 'select', values: ['square', 'dot', 'rounded'] },
    { key: 'color', label: '前景色', kind: 'text', placeholder: '#000000' },
    { key: 'bgColor', label: '背景色', kind: 'text', placeholder: '#ffffff' },
    { key: 'margin', label: '边距', kind: 'text', placeholder: '4' },
  ]

  return (
    <MultiPanel<QrStylingInput, QrStylingOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ dotStyle: 'square', color: '#000000', bgColor: '#ffffff', margin: '4' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => {
        try {
          if (input.text.trim() === '') {
            return <p className={HINT_CLASS}>输入文本，生成风格化二维码</p>
          }
          const { size, data } = matrixOf(input.text.trim())
          const opts = resolveOptions(options)
          return (
            <div className="flex justify-center">
              <StyledQrCanvas size={size} data={data} opts={opts} />
            </div>
          )
        } catch (error) {
          return (
            <p role="alert" className={ERROR_CLASS}>
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={(input, options) => {
        try {
          return toSvgText(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="svg"
    />
  )
}
