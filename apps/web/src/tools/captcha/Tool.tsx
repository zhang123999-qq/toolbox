import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawCaptcha, generateCaptcha } from './utils'
import type { CaptchaInput, CaptchaOptions } from './schema'

const EXAMPLE: CaptchaInput = { text: '' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

interface CanvasProps {
  readonly options: CaptchaOptions
  readonly onText: (text: string) => void
}

/** canvas 子组件：负责按选项生成规格、绘制、释放；内部维护刷新序号 */
function CaptchaCanvas({ options, onText }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nonce, setNonce] = useState(0)

  // spec 在渲染阶段派生（useMemo），错误态直接由 spec.ok 决定，无需 setState
  const spec = useMemo(() => {
    try {
      return { ok: true as const, value: generateCaptcha(options) }
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) }
    }
    // nonce 变化即重新随机
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length, options.charset, options.noAmbiguous, nonce])

  useEffect(() => {
    if (!spec.ok) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawCaptcha(ctx, canvas.width, canvas.height, spec.value)
    onText(spec.value.text)
    // 卸载 / 重绘前清屏，避免残留
    return () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [spec, onText])

  if (!spec.ok) {
    return (
      <p role="alert" className={ERROR_CLASS}>
        {spec.message}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        data-testid="captcha-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded border border-slate-300 bg-white"
      />
      <button
        type="button"
        data-testid="refresh"
        className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        onClick={() => setNonce((n) => n + 1)}
      >
        刷新
      </button>
    </div>
  )
}

export default function Tool() {
  const textRef = useRef('')
  const handleText = useCallback((text: string) => {
    textRef.current = text
  }, [])

  const optionDefs: readonly OptionDef<CaptchaOptions>[] = [
    { key: 'length', label: '长度', kind: 'text', placeholder: '16' },
    { key: 'charset', label: '字符集', kind: 'select', values: ['alnum', 'alpha', 'numeric'] },
    { key: 'noAmbiguous', label: '排除易混淆', kind: 'boolean' },
  ]

  return (
    <MultiPanel<CaptchaInput, CaptchaOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ length: '4', charset: 'alnum', noAmbiguous: true }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(_input, options) => <CaptchaCanvas options={options} onText={handleText} />}
      toText={() => textRef.current}
      downloadExt="txt"
    />
  )
}
