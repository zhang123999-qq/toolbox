import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  downloadBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildHtmlOutput,
  buildOutputFileName,
  buildRamp,
  buildTextOutput,
  computeSampleDimensions,
  errorMessage,
  imageDataToAscii,
  parseCharWidth,
} from './utils'
import type { AsciiArt } from './utils'
import type { ImageToAsciiOptions } from './schema'

interface Result {
  art: AsciiArt
  text: string
  fileName: string
  color: boolean
  previewUrl: string
}

/** 彩色预览：每个字符用原像素颜色着色 */
function AsciiColoredPreview({ art }: { art: AsciiArt }) {
  return (
    <>
      {Array.from({ length: art.rows }, (_, y) => (
        <span key={y}>
          {Array.from({ length: art.cols }, (_, x) => {
            const c = art.cells[y * art.cols + x]
            return (
              <span key={x} style={{ color: `rgb(${c.r},${c.g},${c.b})` }}>
                {c.char}
              </span>
            )
          })}
          {y < art.rows - 1 ? '\n' : null}
        </span>
      ))}
    </>
  )
}

/** 下载结果：彩色模式导出 HTML，纯文本模式导出 TXT */
function downloadResult(r: Result): void {
  if (r.color) {
    const blob = new Blob([buildHtmlOutput(r.art, r.fileName)], {
      type: 'text/html;charset=utf-8',
    })
    downloadBlob(blob, buildOutputFileName(r.fileName, 'html'))
  } else {
    const blob = new Blob([r.text], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, buildOutputFileName(r.fileName, 'txt'))
  }
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<ImageToAsciiOptions>({
    charWidth: '80',
    charset: 'standard',
    invert: 'off',
    color: 'on',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ImageToAsciiOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageToAscii.error.unsupported'))
        const charWidth = parseCharWidth(opts.charWidth)
        const ramp = buildRamp(opts.charset, opts.invert === 'on')
        const color = opts.color === 'on'
        const img = await loadImageFromBlob(file)
        const { width: cols, height: rows } = computeSampleDimensions(
          img.width,
          img.height,
          charWidth,
        )
        const canvas = drawScaled(img, img.width, img.height, cols, rows)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('imageToAscii.error.canvas'))
        const pixels = ctx.getImageData(0, 0, cols, rows).data
        const art = imageDataToAscii(pixels, cols, rows, ramp)
        const text = buildTextOutput(art)
        const preview = await readFileAsDataURL(file)
        setResult({ art, text, fileName: file.name, color, previewUrl: preview })
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
      const file = files?.[0]
      if (!file) return
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<ImageToAsciiOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageToAscii.note')}</p>

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
          {result ? result.fileName : t('imageToAscii.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageToAscii.charWidth')}
          <input
            data-testid="opt-width"
            type="number"
            min={10}
            max={200}
            value={options.charWidth}
            onChange={(e) => handleOptionChange({ charWidth: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageToAscii.charset')}
          <select
            data-testid="opt-charset"
            value={options.charset}
            onChange={(e) =>
              handleOptionChange({ charset: e.target.value as ImageToAsciiOptions['charset'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="standard">{t('imageToAscii.charsetStandard')}</option>
            <option value="simple">{t('imageToAscii.charsetSimple')}</option>
            <option value="blocks">{t('imageToAscii.charsetBlocks')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            data-testid="opt-invert"
            type="checkbox"
            checked={options.invert === 'on'}
            onChange={(e) => handleOptionChange({ invert: e.target.checked ? 'on' : 'off' })}
          />
          {t('imageToAscii.invert')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            data-testid="opt-color"
            type="checkbox"
            checked={options.color === 'on'}
            onChange={(e) => handleOptionChange({ color: e.target.checked ? 'on' : 'off' })}
          />
          {t('imageToAscii.color')}
        </label>
        {result && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageToAscii.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('imageToAscii.processing')}</p>}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {t('imageToAscii.original')}
            </figcaption>
            <img
              src={result.previewUrl}
              alt=""
              className="max-h-64 rounded border object-contain"
            />
          </figure>
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {t('imageToAscii.preview')}
            </figcaption>
            {result.color ? (
              <pre
                data-testid="ascii-preview"
                className="max-h-96 overflow-auto rounded border bg-black p-2 font-mono text-[8px] leading-none text-white"
              >
                <AsciiColoredPreview art={result.art} />
              </pre>
            ) : (
              <pre
                data-testid="ascii-preview"
                className="max-h-96 overflow-auto rounded border bg-black p-2 font-mono text-[8px] leading-none text-white"
              >
                {result.text}
              </pre>
            )}
          </figure>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageToAscii.stats')} {result.art.cols} × {result.art.rows}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadResult(result)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {result.color ? t('imageToAscii.downloadHtml') : t('imageToAscii.downloadTxt')}
          </button>
        </div>
      )}
    </div>
  )
}
