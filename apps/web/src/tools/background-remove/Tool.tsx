import { useCallback, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  chromaKeyRemove,
  errorMessage,
  floodFillRemove,
  parseHexColor,
  parseTolerance,
  toleranceToDistSq,
} from './utils'
import type { BackgroundRemoveOptions } from './schema'

/**
 * background-remove —— 全局编号 #457
 * 上传图片 → loadImageFromBlob → 原尺寸绘制到 Canvas → getImageData →
 * utils 纯函数抠除 → putImageData → 导出透明 PNG。flood fill 为同步计算，
 * try/finally 包裹保证 processing 状态复位。
 *
 * i18n：本工具的 backgroundRemove.* 文案键由仓库流程统一注册到
 * i18n/messages 文件后生效；合并前此处放宽 t 的签名保证 tsc 通过。
 * 完整键值对（en+zh）见本工具 README 与交付报告。
 * 禁止 mock ../../i18n、禁止 as MessageKey。
 */
interface Result {
  url: string
  fileName: string
  previewUrl: string
  removed: number
  origSize: number
  newSize: number
  blob: Blob
}

const MODE_OPTIONS = ['edge', 'chroma'] as const

/** 棋盘格背景：让透明像素可视化 */
const CHECKER_STYLE: CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%)',
  backgroundSize: '16px 16px',
}

const INITIAL_OPTIONS: BackgroundRemoveOptions = {
  mode: 'edge',
  tolerance: '25',
  targetColor: '#00ff00',
}

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<BackgroundRemoveOptions>(INITIAL_OPTIONS)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (f: File, opts: BackgroundRemoveOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(f.size)
        if (!isSupportedImageFile(f)) throw new Error(t('backgroundRemove.error.unsupported'))
        const tolerance = parseTolerance(opts.tolerance)
        const img = await loadImageFromBlob(f)
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('backgroundRemove.error.noContext'))
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const distSq = toleranceToDistSq(tolerance)
        const buf = {
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        }
        const { data, removed } =
          opts.mode === 'edge'
            ? floodFillRemove(buf, distSq)
            : chromaKeyRemove(buf, parseHexColor(opts.targetColor), distSq)
        if (removed === 0) throw new Error(t('backgroundRemove.error.nothingRemoved'))
        imageData.data.set(data)
        ctx.putImageData(imageData, 0, 0)
        const blob = await canvasToBlob(canvas, 'image/png')
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(f)
        setResult({
          url,
          fileName: buildOutputFileName(f.name),
          previewUrl: preview,
          removed,
          origSize: f.size,
          newSize: blob.size,
          blob,
        })
        setFile(f)
        setFileName(f.name)
      } catch (err) {
        setError(errorMessage(err))
        setResult(null)
      } finally {
        setProcessing(false)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0]
      if (!f) return
      void processFile(f, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<BackgroundRemoveOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理；无文件时不处理（两条分支均有单测）
      if (file) void processFile(file, next)
    },
    [file, options, processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setFile(null)
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('backgroundRemove.note')}</p>

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
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('backgroundRemove.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('backgroundRemove.mode')}
          <select
            data-testid="opt-mode"
            value={options.mode}
            onChange={(e) =>
              handleOptionChange({ mode: e.target.value as BackgroundRemoveOptions['mode'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {MODE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {t(`backgroundRemove.mode.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('backgroundRemove.tolerance')}
          <input
            data-testid="opt-tolerance"
            type="number"
            min={0}
            max={100}
            value={options.tolerance}
            onChange={(e) => handleOptionChange({ tolerance: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {options.mode === 'chroma' && (
          <label className="flex items-center gap-2 text-sm">
            {t('backgroundRemove.targetColor')}
            <input
              data-testid="opt-color"
              type="color"
              value={options.targetColor}
              onChange={(e) => handleOptionChange({ targetColor: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
            />
          </label>
        )}
        {result && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('backgroundRemove.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('backgroundRemove.processing')}</p>}
      {/* 用 !== null 而非真值判断：i18n 键合并前的单测阶段 t() 可能返回空串，错误态仍须可渲染 */}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：原图与抠除结果并排，棋盘格衬底展示透明效果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('backgroundRemove.original')} ({formatBytes(result.origSize)})
              </figcaption>
              <img
                src={result.previewUrl}
                alt=""
                style={CHECKER_STYLE}
                className="max-h-64 rounded border object-contain"
              />
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('backgroundRemove.result')} ({formatBytes(result.newSize)})
              </figcaption>
              <img
                src={result.url}
                alt=""
                style={CHECKER_STYLE}
                className="max-h-64 rounded border object-contain"
              />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('backgroundRemove.removed')}: {result.removed.toLocaleString()}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('backgroundRemove.download')}
          </button>
        </div>
      )}
    </div>
  )
}
