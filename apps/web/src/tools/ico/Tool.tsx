import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  DEFAULT_ICO_SIZES,
  ERR_NO_SIZE_SELECTED,
  ERR_UNSUPPORTED_TYPE,
  ICO_SIZE_OPTIONS,
  assertFileSizeOk,
  buildIco,
  buildOutputFileName,
  errorMessage,
  parseSelectedSizes,
} from './utils'
import type { IcoOptions } from './schema'

interface Result {
  url: string
  fileName: string
  blob: Blob
  sizes: number[]
  previewUrl: string
  previewSize: number
  newSize: number
}

/**
 * 临时翻译封装。
 * 「ico.*」文案键由主流程统一合入 i18n messages 文件（本工具不自行改动），
 * 此处把键类型放宽为 string，保证 tsc 全量通过；键合入后可简化为直接 t('ico.*')。
 * 注意：合入前缺键时 t() 返回 undefined，因此错误文案走 utils 抛出的中文常量
 * （必为真值），展示文案缺失仅影响显示，不影响流程。
 */
function useToolT(): (key: string) => string {
  const t = useTranslate()
  return (key) => t(key as MessageKey)
}

export default function Tool() {
  const tt = useToolT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<IcoOptions>({
    sizes: DEFAULT_ICO_SIZES.map(String),
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(async (file: File, opts: IcoOptions) => {
    setProcessing(true)
    setError(null)
    try {
      assertFileSizeOk(file.size)
      if (!isSupportedImageFile(file)) throw new Error(ERR_UNSUPPORTED_TYPE)
      const sizes = parseSelectedSizes(opts.sizes)
      const img = await loadImageFromBlob(file)
      const pngParts: Array<{ size: number; blob: Blob }> = []
      for (const size of sizes) {
        const canvas = drawScaled(img, img.width, img.height, size, size)
        const png = await canvasToBlob(canvas, 'image/png')
        pngParts.push({ size, blob: png })
      }
      const icoBytes = buildIco(
        await Promise.all(
          pngParts.map(async (part) => ({
            size: part.size,
            data: new Uint8Array(await part.blob.arrayBuffer()),
          })),
        ),
      )
      const blob = new Blob([icoBytes], { type: 'image/x-icon' })
      // sizes 经 parseSelectedSizes 校验非空且升序，末位即最大尺寸
      const largest = pngParts[pngParts.length - 1]
      setResult({
        url: URL.createObjectURL(blob),
        fileName: buildOutputFileName(file.name),
        blob,
        sizes,
        previewUrl: URL.createObjectURL(largest.blob),
        previewSize: largest.size,
        newSize: blob.size,
      })
      setFileName(file.name)
    } catch (err) {
      setError(errorMessage(err))
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      void processFile(file, options)
    },
    [options, processFile],
  )

  const toggleSize = useCallback(
    (size: number) => {
      const key = String(size)
      const next = options.sizes.includes(key)
        ? options.sizes.filter((s) => s !== key)
        : [...options.sizes, key]
      const opts = { ...options, sizes: next }
      setOptions(opts)
      if (next.length === 0) {
        // 至少保留一个尺寸：直接报错，不走异步重新生成，避免竞态覆盖
        setResult(null)
        setError(ERR_NO_SIZE_SELECTED)
        return
      }
      // 有文件时尺寸变更即重新生成
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], opts)
    },
    [options, processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{tt('ico.note')}</p>

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
          {fileName ? fileName : tt('ico.dropHint')}
        </p>
      </label>

      {/* 尺寸复选组 */}
      <fieldset className="flex flex-wrap items-center gap-3">
        <legend className="text-sm text-slate-600 dark:text-slate-400">{tt('ico.sizes')}</legend>
        {ICO_SIZE_OPTIONS.map((size) => (
          <label key={size} className="flex cursor-pointer items-center gap-1 text-sm">
            <input
              data-testid={`opt-size-${size}`}
              type="checkbox"
              checked={options.sizes.includes(String(size))}
              onChange={() => toggleSize(size)}
            />
            {size}px
          </label>
        ))}
        {result && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {tt('ico.reset')}
          </button>
        )}
      </fieldset>

      {processing && <p data-testid="processing">{tt('ico.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：预览最大选中尺寸的 PNG，附 ICO 文件信息与下载 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <figcaption data-testid="preview-caption" className="mb-1 text-sm text-slate-500">
              {tt('ico.preview')}（{result.previewSize}px）
            </figcaption>
            <img
              data-testid="preview"
              src={result.previewUrl}
              alt=""
              className="max-h-64 rounded border object-contain"
            />
          </figure>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {tt('ico.stats')}
            {result.sizes.join(' / ')}px（{formatBytes(result.newSize)}）
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {tt('ico.download')}
          </button>
        </div>
      )}
    </div>
  )
}
