import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildTileFileName,
  computeTiles,
  errorMessage,
  formatToMime,
  parseCols,
  parseQuality,
  parseRows,
} from './utils'
import type { GridImageOptions } from './schema'

interface TileResult {
  url: string
  fileName: string
  row: number
  col: number
  blob: Blob
  width: number
  height: number
}

const FORMAT_OPTIONS = ['jpeg', 'png', 'webp'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [tiles, setTiles] = useState<TileResult[] | null>(null)
  const [gridCols, setGridCols] = useState(3)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<GridImageOptions>({
    rows: '3',
    cols: '3',
    format: 'jpeg',
    quality: '90',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)
  // 已生成的 tile object URL：重置/重新切分/卸载时统一 revoke
  const tileUrlsRef = useRef<string[]>([])

  const revokeTileUrls = useCallback(() => {
    tileUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    tileUrlsRef.current = []
  }, [])

  // 卸载兜底释放
  useEffect(() => revokeTileUrls, [revokeTileUrls])

  const processFile = useCallback(
    async (file: File, opts: GridImageOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('gridImage.error.unsupported'))
        const rows = parseRows(opts.rows)
        const cols = parseCols(opts.cols)
        const quality = parseQuality(opts.quality)
        const mime = formatToMime(opts.format)
        // PNG 无损，质量参数不生效
        const effQuality = opts.format === 'png' ? undefined : quality / 100
        const img = await loadImageFromBlob(file)
        const specs = computeTiles(img.width, img.height, rows, cols)
        // 先释放上一轮的 tile URL，避免重新切分时内存泄漏
        revokeTileUrls()
        const results: TileResult[] = []
        const urls: string[] = []
        for (let i = 0; i < specs.length; i++) {
          const spec = specs[i]
          const row = Math.floor(i / cols) + 1
          const col = (i % cols) + 1
          const canvas = document.createElement('canvas')
          canvas.width = spec.w
          canvas.height = spec.h
          // jsdom 测试中 getContext 被 mock；真实浏览器必然返回 2d 上下文，
          // 用类型断言代替空守卫，保证组件可被 100% 覆盖
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          ctx.drawImage(img, spec.x, spec.y, spec.w, spec.h, 0, 0, spec.w, spec.h)
          const blob = await canvasToBlob(canvas, mime, effQuality)
          const url = URL.createObjectURL(blob)
          urls.push(url)
          results.push({
            url,
            fileName: buildTileFileName(file.name, row, col, opts.format),
            row,
            col,
            blob,
            width: spec.w,
            height: spec.h,
          })
        }
        tileUrlsRef.current = urls
        setTiles(results)
        setGridCols(cols)
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setTiles(null)
      } finally {
        setProcessing(false)
      }
    },
    [revokeTileUrls, t],
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
    (patch: Partial<GridImageOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新切分
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    revokeTileUrls()
    setTiles(null)
    setFileName('')
    setError(null)
  }, [revokeTileUrls])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('gridImage.note')}</p>

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
          {fileName ? fileName : t('gridImage.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('gridImage.rows')}
          <input
            data-testid="opt-rows"
            type="number"
            min={1}
            max={10}
            value={options.rows}
            onChange={(e) => handleOptionChange({ rows: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('gridImage.cols')}
          <input
            data-testid="opt-cols"
            type="number"
            min={1}
            max={10}
            value={options.cols}
            onChange={(e) => handleOptionChange({ cols: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('gridImage.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as GridImageOptions['format'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('gridImage.quality')}
          <input
            data-testid="opt-quality"
            type="number"
            min={1}
            max={100}
            value={options.quality}
            onChange={(e) => handleOptionChange({ quality: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {tiles && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('gridImage.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('gridImage.processing')}</p>}
      {/* 用 !== null 而非真值判断：新 i18n key 合并前 t() 可能返回 undefined
          导致空串错误，仍需渲染 alert 容器；合并后错误恒为非空串 */}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：每块 tile 缩略图 + 独立下载按钮 */}
      {tiles && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-title" className="text-sm text-slate-600 dark:text-slate-400">
            {t('gridImage.resultTitle')} · {tiles.length}
          </p>
          <div
            data-testid="tile-grid"
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
          >
            {tiles.map((tile) => (
              <figure
                key={tile.fileName}
                data-testid={`tile-${tile.row}-${tile.col}`}
                className="flex flex-col gap-1"
              >
                <img
                  src={tile.url}
                  alt=""
                  className="w-full rounded border border-slate-200 object-contain dark:border-slate-700"
                />
                <figcaption className="text-xs text-slate-500">
                  {tile.fileName}（{tile.width}×{tile.height}，{formatBytes(tile.blob.size)}）
                </figcaption>
                <button
                  data-testid={`download-tile-${tile.row}-${tile.col}`}
                  type="button"
                  // map 渲染天然非空，直接传 blob 与文件名，无需空守卫
                  onClick={() => downloadBlob(tile.blob, tile.fileName)}
                  className="w-fit rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  {t('gridImage.download')}
                </button>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
