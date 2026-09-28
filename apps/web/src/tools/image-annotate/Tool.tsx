import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  HISTORY_LIMIT,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  getArrowHead,
  historyPop,
  historyPush,
  mouseToCanvas,
  parseColor,
  parseFontSize,
  parseLineWidth,
  pixelateRegion,
} from './utils'
import type { ImageAnnotateOptions } from './schema'

/**
 * image-annotate（#480）图片标注
 *
 * 双层画布：底层按原图 1:1 绘制原图，上层透明画布接收鼠标事件做标注。
 * 图形类工具（直线/箭头/矩形/椭圆）落笔时保存快照，mousemove 先恢复快照
 * 再画当前形状，实现 rubber-band 预览；mouseup 把标注层快照推入历史栈
 * （ImageData 方案，撤销时 putImageData 恢复，上限 30 步）。
 * 马赛克笔刷：在底图对应圆形区域取像素，经 utils.pixelateRegion 像素化后
 * 写回标注层（复用取回的 ImageData 对象写回，不在 Tool 层构造 ImageData）。
 */

/** 箭头头部：翼长 = 线宽 × 4，箭杆与翼夹角 30° */
const ARROW_HEAD_ANGLE = 30

const TOOL_LABEL_KEYS = {
  brush: 'imageAnnotate.tool.brush',
  line: 'imageAnnotate.tool.line',
  arrow: 'imageAnnotate.tool.arrow',
  rect: 'imageAnnotate.tool.rect',
  ellipse: 'imageAnnotate.tool.ellipse',
  text: 'imageAnnotate.tool.text',
  mosaic: 'imageAnnotate.tool.mosaic',
} as const

const TOOL_IDS = Object.keys(TOOL_LABEL_KEYS) as (keyof typeof TOOL_LABEL_KEYS)[]

/** 取 2D 上下文，取不到时抛错（调用方统一转为错误提示行内展示） */
function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  return ctx
}

/** 绘制箭头：主干 + 两翼；零长度时只画主干（getArrowHead 会因方向无效抛错） */
function drawArrow(
  dctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  lineWidth: number,
): void {
  dctx.moveTo(sx, sy)
  dctx.lineTo(tx, ty)
  dctx.stroke()
  if (Math.hypot(tx - sx, ty - sy) === 0) return
  const head = getArrowHead(tx, ty, sx, sy, lineWidth * 4, ARROW_HEAD_ANGLE)
  dctx.moveTo(tx, ty)
  dctx.lineTo(head.p1x, head.p1y)
  dctx.moveTo(tx, ty)
  dctx.lineTo(head.p2x, head.p2y)
  dctx.stroke()
}

/**
 * 马赛克：在底图以落笔点为圆心、线宽 × 4 为半径的区域取像素，
 * 做像素化后写回标注层同位置。
 */
function applyMosaic(
  base: HTMLCanvasElement,
  dctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lineWidth: number,
): void {
  const radius = lineWidth * 4
  const size = Math.ceil(radius * 2)
  const sx = Math.round(x - radius)
  const sy = Math.round(y - radius)
  const region = ctx2d(base).getImageData(sx, sy, size, size)
  const block = Math.max(1, Math.round(lineWidth))
  const pix = pixelateRegion(region.data, region.width, region.height, block)
  region.data.set(pix)
  dctx.putImageData(region, sx, sy)
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const baseRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef<HTMLCanvasElement>(null)
  // 原图元素与尺寸放 ref：绘制回调里直接取用，避免 state 空守卫分支
  const imgRef = useRef<HTMLImageElement | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  // 绘制过程状态放 ref：mousedown 记录起点/快照/样式，mousemove 做预览
  const drawingRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0 })
  const snapshotRef = useRef<ImageData | null>(null)
  const styleRef = useRef({ color: '#ff0000', lineWidth: 4 })
  const historyRef = useRef<ImageData[]>([])

  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  // 仅用于渲染两层画布与工具栏；绘制逻辑读 sizeRef
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [historyCount, setHistoryCount] = useState(0)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)
  const [options, setOptions] = useState<ImageAnnotateOptions>({
    tool: 'brush',
    color: '#ff0000',
    lineWidth: '4',
    fontSize: '32',
    text: '',
  })

  const loadFile = useCallback(
    async (file: File) => {
      setLoading(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageAnnotate.error.unsupported'))
        const img = await loadImageFromBlob(file)
        imgRef.current = img
        sizeRef.current = { w: img.width, h: img.height }
        historyRef.current = []
        drawingRef.current = false
        setHistoryCount(0)
        setFileName(file.name)
        setImgSize({ w: img.width, h: img.height })
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      void loadFile(file)
    },
    [loadFile],
  )

  const handleOptionChange = useCallback((patch: Partial<ImageAnnotateOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setImgSize(null)
    setFileName('')
    setError(null)
    historyRef.current = []
    drawingRef.current = false
    setHistoryCount(0)
  }, [])

  // 底图：图片就绪后按原尺寸 1:1 绘制，并清空标注层
  useEffect(() => {
    if (!imgSize) return
    const img = imgRef.current as HTMLImageElement
    const base = baseRef.current as HTMLCanvasElement
    const draw = drawRef.current as HTMLCanvasElement
    ctx2d(base).drawImage(img, 0, 0)
    ctx2d(draw).clearRect(0, 0, imgSize.w, imgSize.h)
  }, [imgSize])

  /** 每次落笔（mouseup / 文字放置）后把标注层快照推入历史 */
  const pushHistory = useCallback(() => {
    const dctx = ctx2d(drawRef.current as HTMLCanvasElement)
    const { w, h } = sizeRef.current
    historyRef.current = historyPush(
      historyRef.current,
      dctx.getImageData(0, 0, w, h),
      HISTORY_LIMIT,
    )
    setHistoryCount(historyRef.current.length)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = mouseToCanvas(e.clientX, e.clientY, rect.left, rect.top)
    try {
      const color = parseColor(options.color)
      const lineWidth = parseLineWidth(options.lineWidth)
      const dctx = ctx2d(drawRef.current as HTMLCanvasElement)
      dctx.strokeStyle = color
      dctx.fillStyle = color
      dctx.lineWidth = lineWidth
      dctx.lineCap = 'round'
      dctx.lineJoin = 'round'
      styleRef.current = { color, lineWidth }
      if (options.tool === 'text') {
        // 文字工具：点击即放置，不进入拖拽绘制流程
        const text = options.text.trim()
        if (text === '') {
          setError(t('imageAnnotate.error.emptyText'))
          return
        }
        const fontSize = parseFontSize(options.fontSize)
        dctx.font = `${fontSize}px sans-serif`
        dctx.fillText(text, pos.x, pos.y)
        pushHistory()
        setError(null)
        return
      }
      drawingRef.current = true
      startRef.current = pos
      snapshotRef.current = dctx.getImageData(0, 0, sizeRef.current.w, sizeRef.current.h)
      if (options.tool === 'brush') {
        dctx.beginPath()
        dctx.moveTo(pos.x, pos.y)
      } else if (options.tool === 'mosaic') {
        applyMosaic(baseRef.current as HTMLCanvasElement, dctx, pos.x, pos.y, lineWidth)
      }
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = mouseToCanvas(e.clientX, e.clientY, rect.left, rect.top)
    const dctx = ctx2d(drawRef.current as HTMLCanvasElement)
    const { color, lineWidth } = styleRef.current
    const start = startRef.current
    const tool = options.tool
    dctx.strokeStyle = color
    dctx.fillStyle = color
    dctx.lineWidth = lineWidth
    dctx.lineCap = 'round'
    dctx.lineJoin = 'round'
    if (tool === 'brush') {
      dctx.lineTo(pos.x, pos.y)
      dctx.stroke()
    } else if (tool === 'mosaic') {
      applyMosaic(baseRef.current as HTMLCanvasElement, dctx, pos.x, pos.y, lineWidth)
    } else {
      // 图形工具：先恢复落笔快照，再画当前形状（rubber-band 预览）
      dctx.putImageData(snapshotRef.current as ImageData, 0, 0)
      dctx.beginPath()
      if (tool === 'line') {
        dctx.moveTo(start.x, start.y)
        dctx.lineTo(pos.x, pos.y)
        dctx.stroke()
      } else if (tool === 'arrow') {
        drawArrow(dctx, start.x, start.y, pos.x, pos.y, lineWidth)
      } else if (tool === 'rect') {
        dctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y)
      } else {
        dctx.ellipse(
          (start.x + pos.x) / 2,
          (start.y + pos.y) / 2,
          Math.abs(pos.x - start.x) / 2,
          Math.abs(pos.y - start.y) / 2,
          0,
          0,
          Math.PI * 2,
        )
        dctx.stroke()
      }
    }
  }

  /** 落笔结束：推入历史；未在绘制中时直接返回（mouseup 杂散事件） */
  const finishStroke = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    pushHistory()
  }

  const handleUndo = () => {
    // 按钮在历史为空时 disabled，此处栈顶必存在
    const dctx = ctx2d(drawRef.current as HTMLCanvasElement)
    const { stack, top } = historyPop(historyRef.current)
    historyRef.current = stack
    setHistoryCount(stack.length)
    dctx.putImageData(top as ImageData, 0, 0)
  }

  const handleClear = () => {
    const dctx = ctx2d(drawRef.current as HTMLCanvasElement)
    const { w, h } = sizeRef.current
    dctx.clearRect(0, 0, w, h)
    historyRef.current = []
    setHistoryCount(0)
  }

  const handleDownload = async () => {
    setError(null)
    try {
      const { w, h } = sizeRef.current
      const out = document.createElement('canvas')
      out.width = w
      out.height = h
      const octx = ctx2d(out)
      octx.drawImage(baseRef.current as HTMLCanvasElement, 0, 0)
      octx.drawImage(drawRef.current as HTMLCanvasElement, 0, 0)
      const blob = await canvasToBlob(out, 'image/png')
      downloadBlob(blob, buildOutputFileName(fileName))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageAnnotate.note')}</p>

      {/* 文件投放区：用 label 包裹，原生可点击/键盘聚焦，无需额外 a11y 分支 */}
      <label
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <input
          ref={fileRef}
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('imageAnnotate.dropHint')}
        </p>
      </label>

      {/* 画布与工具栏：图片加载后出现 */}
      {imgSize && (
        <div className="flex flex-col gap-3">
          <p data-testid="canvas-size" className="text-sm text-slate-500 dark:text-slate-400">
            {imgSize.w}×{imgSize.h} · {t('imageAnnotate.canvasSizeHint')}
          </p>

          {/* 标注工具 */}
          <div className="flex flex-wrap gap-2">
            {TOOL_IDS.map((id) => (
              <button
                key={id}
                data-testid={`tool-${id}`}
                type="button"
                onClick={() => handleOptionChange({ tool: id })}
                className={`rounded border px-3 py-1 text-sm ${
                  options.tool === id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {t(TOOL_LABEL_KEYS[id])}
              </button>
            ))}
          </div>

          {/* 选项 */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              {t('imageAnnotate.color')}
              <input
                data-testid="opt-color"
                type="color"
                value={options.color}
                onChange={(e) => handleOptionChange({ color: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('imageAnnotate.lineWidth')}
              <input
                data-testid="opt-linewidth"
                type="number"
                min={1}
                max={50}
                value={options.lineWidth}
                onChange={(e) => handleOptionChange({ lineWidth: e.target.value })}
                className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('imageAnnotate.fontSize')}
              <input
                data-testid="opt-fontsize"
                type="number"
                min={12}
                max={120}
                value={options.fontSize}
                onChange={(e) => handleOptionChange({ fontSize: e.target.value })}
                className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('imageAnnotate.textLabel')}
              <input
                data-testid="opt-text"
                type="text"
                maxLength={200}
                value={options.text}
                placeholder={t('imageAnnotate.textPlaceholder')}
                onChange={(e) => handleOptionChange({ text: e.target.value })}
                className="w-48 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>

          {/* 操作 */}
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="undo"
              type="button"
              disabled={historyCount === 0}
              onClick={handleUndo}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700"
            >
              {t('imageAnnotate.undo')}
            </button>
            <button
              data-testid="clear"
              type="button"
              onClick={handleClear}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('imageAnnotate.clear')}
            </button>
            <button
              data-testid="download"
              type="button"
              onClick={() => void handleDownload()}
              className="rounded bg-blue-600 px-4 py-1 text-sm text-white hover:bg-blue-700"
            >
              {t('imageAnnotate.download')}
            </button>
            <button
              data-testid="reset"
              type="button"
              onClick={handleReset}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('imageAnnotate.reset')}
            </button>
          </div>

          {/* 双层画布：底层原图 1:1，上层透明标注层接收鼠标事件 */}
          <div
            className="relative overflow-auto rounded border border-slate-300 dark:border-slate-700"
            style={{ width: imgSize.w, height: imgSize.h }}
          >
            <canvas
              ref={baseRef}
              data-testid="base-canvas"
              width={imgSize.w}
              height={imgSize.h}
              className="absolute left-0 top-0"
            />
            <canvas
              ref={drawRef}
              data-testid="draw-canvas"
              width={imgSize.w}
              height={imgSize.h}
              className="absolute left-0 top-0 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={finishStroke}
              onMouseLeave={finishStroke}
            />
          </div>
        </div>
      )}

      {loading && <p data-testid="processing">{t('imageAnnotate.processing')}</p>}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
