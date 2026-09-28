import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { EyedropperFormOptions, EyedropperInput } from './schema'
import { buildColorReport, parseColorInput, rgbToHex, sampleAverageColor } from './utils'
import type { Rgb } from './utils'
interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>
}

export default function Tool() {
  const [color, setColor] = useState<Rgb | null>(null)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgSizeRef = useRef({ width: 0, height: 0 })

  const optionDefs: readonly OptionDef<EyedropperFormOptions>[] = [
    { key: 'radius', label: '图片取色采样半径（像素，0=单点）', kind: 'text', placeholder: '2' },
  ]

  /** 卸载时释放图片 URL */
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  function publish(rgb: Rgb): void {
    setColor(rgb)
    setReport(buildColorReport(rgb))
    setError('')
  }

  /** 系统取色器：优先用 EyeDropper API */
  async function handleSystemPick(): Promise<void> {
    setError('')
    const Ctor = (window as unknown as { EyeDropper?: new () => EyeDropperLike }).EyeDropper
    if (!Ctor) {
      setError(
        '当前浏览器不支持系统取色器（缺少 EyeDropper API），请用下方「从图片取色」或换用 Chrome / Edge',
      )
      return
    }
    setPending(true)
    try {
      const picker = new Ctor()
      const { sRGBHex } = await picker.open()
      publish(parseColorInput(sRGBHex))
    } catch (err) {
      // 用户按 ESC 取消属于正常操作，只给轻提示，不算错误
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('已取消取色')
      } else {
        setError(err instanceof Error ? `取色失败：${err.message}` : '取色失败，请重试')
      }
    } finally {
      setPending(false)
    }
  }

  /** 手动输入颜色值解析 */
  function handleManual(input: EyedropperInput): void {
    try {
      publish(parseColorInput(input.text))
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  /** 上传图片：画到 canvas，点按取色 */
  function handleImage(file: File): void {
    setError('')
    const url = URL.createObjectURL(file)
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('当前浏览器无法读取图像像素，请换用 Chrome / Edge 重试')
        return
      }
      ctx.drawImage(img, 0, 0)
      imgSizeRef.current = { width: img.naturalWidth, height: img.naturalHeight }
    }
    img.onerror = () => setError('图片加载失败：文件可能已损坏')
    img.src = url
  }

  /** 点按图片取色：按采样半径做区域平均 */
  function handleCanvasClick(
    event: React.MouseEvent<HTMLCanvasElement>,
    raw: EyedropperFormOptions,
  ): void {
    const canvas = canvasRef.current
    if (!canvas || imgSizeRef.current.width === 0) {
      setError('请先上传图片')
      return
    }
    try {
      const opts = optionsSchema.parse(raw)
      const rect = canvas.getBoundingClientRect()
      if (
        !Number.isFinite(rect.width) ||
        !Number.isFinite(rect.height) ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        setError('图片尚未渲染完成，请稍后再试')
        return
      }
      const scaleX = imgSizeRef.current.width / rect.width
      const scaleY = imgSizeRef.current.height / rect.height
      const x = Math.floor((event.clientX - rect.left) * scaleX)
      const y = Math.floor((event.clientY - rect.top) * scaleY)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('当前浏览器无法读取图像像素，请换用 Chrome / Edge 重试')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      publish(
        sampleAverageColor(imageData.data, imageData.width, imageData.height, x, y, opts.radius),
      )
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  return (
    <MultiPanel<EyedropperInput, EyedropperFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ radius: '2' }}
      optionDefs={optionDefs}
      example={{ text: '#ff6b00' }}
      renderOutput={(input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="system-pick"
              className={SECONDARY_BUTTON}
              disabled={pending}
              onClick={() => void handleSystemPick()}
            >
              {pending ? '取色中…' : '从屏幕取色'}
            </button>
            <button
              type="button"
              data-testid="manual-parse"
              className={SECONDARY_BUTTON}
              onClick={() => handleManual(input)}
            >
              解析输入框颜色
            </button>
            <label className={SECONDARY_BUTTON} htmlFor="eyedropper-file">
              从图片取色
            </label>
            <input
              id="eyedropper-file"
              type="file"
              accept="image/*"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) handleImage(f)
                event.target.value = ''
              }}
            />
          </div>
          <canvas
            ref={canvasRef}
            data-testid="image-canvas"
            className={imageUrl ? 'max-w-full cursor-crosshair rounded' : 'hidden'}
            onClick={(event) => handleCanvasClick(event, options)}
          />
          {imageUrl ? (
            <p className="text-sm text-slate-500">点击图片任意位置取色（按采样半径取区域平均值）</p>
          ) : null}
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {color ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span
                  data-testid="color-swatch"
                  className="inline-block h-12 w-12 rounded border border-slate-300"
                  style={{ backgroundColor: rgbToHex(color) }}
                />
                <p
                  data-testid="result-info"
                  className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
                >
                  {report}
                </p>
              </div>
            </div>
          ) : null}
          {!color && !error ? (
            <p className="text-sm text-slate-500">
              点「从屏幕取色」用系统取色器在屏幕任意位置取色；或在左侧输入框填颜色值（如
              #ff6b00）点「解析输入框颜色」；也可以上传图片后点击取色。全程本地处理。
            </p>
          ) : null}
        </div>
      )}
      toText={() => report}
      downloadExt="txt"
    />
  )
}
