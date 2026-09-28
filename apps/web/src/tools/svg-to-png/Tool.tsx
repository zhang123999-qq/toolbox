import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  readFileAsDataURL,
} from '../../lib/image'
import {
  assertFileSizeOk,
  assertSvgText,
  buildOutputFileName,
  computeTargetSize,
  errorMessage,
  isSvgFile,
  parseBackgroundColor,
  parseSvgDimensions,
} from './utils'
import type { BackgroundMode } from './utils'
import type { SvgToPngOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  size: number
  preview: string
  blob: Blob
}

/**
 * 经 Blob URL 把 SVG 文本加载为 Image。
 * onload / onerror 都会释放 URL，避免泄漏。
 */
function loadSvgImage(svgText: string, invalidMessage: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(invalidMessage))
    }
    img.src = url
  })
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<SvgToPngOptions>({
    width: '',
    height: '',
    background: 'transparent',
    customColor: '#ffffff',
  })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: SvgToPngOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSvgFile(file)) throw new Error(t('svgToPng.error.unsupported'))
        const svgText = assertSvgText(await file.text())
        const bg = parseBackgroundColor(opts.background, opts.customColor)
        const img = await loadSvgImage(svgText, t('svgToPng.error.invalidSvg'))
        // 自然尺寸：优先 SVG 文本声明，其次 Image 实际解码尺寸
        const natural = parseSvgDimensions(svgText) ?? { width: img.width, height: img.height }
        const { width, height } = computeTargetSize(natural, opts.width, opts.height)
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('svgToPng.error.noCanvas'))
        if (bg) {
          ctx.fillStyle = bg
          ctx.fillRect(0, 0, width, height)
        }
        ctx.drawImage(img, 0, 0, width, height)
        const blob = await canvasToBlob(canvas, 'image/png')
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name),
          width,
          height,
          size: blob.size,
          preview,
          blob,
        })
        setFileName(file.name)
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
      if (!files || files.length === 0) return
      const file = files[0]
      setCurrentFile(file)
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<SvgToPngOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      if (currentFile) void processFile(currentFile, next)
    },
    [options, processFile, currentFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setCurrentFile(null)
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('svgToPng.note')}</p>

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
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('svgToPng.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('svgToPng.width')}
          <input
            data-testid="opt-width"
            type="number"
            min={1}
            placeholder={t('svgToPng.autoSize')}
            value={options.width}
            onChange={(e) => handleOptionChange({ width: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('svgToPng.height')}
          <input
            data-testid="opt-height"
            type="number"
            min={1}
            placeholder={t('svgToPng.autoSize')}
            value={options.height}
            onChange={(e) => handleOptionChange({ height: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('svgToPng.background')}
          <select
            data-testid="opt-background"
            value={options.background}
            onChange={(e) => handleOptionChange({ background: e.target.value as BackgroundMode })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="transparent">{t('svgToPng.bgTransparent')}</option>
            <option value="white">{t('svgToPng.bgWhite')}</option>
            <option value="custom">{t('svgToPng.bgCustom')}</option>
          </select>
        </label>
        {options.background === 'custom' && (
          <label className="flex items-center gap-2 text-sm">
            {t('svgToPng.customColor')}
            <input
              data-testid="opt-color"
              type="text"
              value={options.customColor}
              onChange={(e) => handleOptionChange({ customColor: e.target.value })}
              className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              placeholder="#rrggbb"
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
            {t('svgToPng.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('svgToPng.processing')}</p>}
      {/* 用 !== null 而非 truthy：i18n 键合并前 t() 可能返回 undefined，
          错误结构仍需渲染（测试只断言 data-testid 结构） */}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('svgToPng.original')}
              </figcaption>
              <img src={result.preview} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('svgToPng.converted')}
              </figcaption>
              <img
                data-testid="result-img"
                src={result.url}
                alt=""
                className="max-h-64 rounded border object-contain"
              />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('svgToPng.statsLabel')}
            {result.width}×{result.height}，{formatBytes(result.size)}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('svgToPng.download')}
          </button>
        </div>
      )}
    </div>
  )
}
