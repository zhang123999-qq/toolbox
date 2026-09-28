import { useCallback, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { canvasToBlob, downloadBlob } from '../../lib/image'
import {
  MAX_IMAGES,
  assertFileSizeOk,
  assertImageSizeOk,
  buildImageFileName,
  collectImageRefs,
  formatToMime,
  isEncryptedPdfError,
  isImageDataLike,
  isPdfFile,
  normalizeToRgba,
} from './utils'
import type { NormalizedImage } from './utils'
import type { PdfToImageExtractOptions } from './schema'
// pdfjs worker：与 pdfjs-dist 打包在一起的 min 版 worker，本地加载不经过网络 CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface ExtractedImage {
  index: number
  page: number
  url: string
  fileName: string
  width: number
  height: number
  blob: Blob
}

interface Progress {
  current: number
  total: number
}

const FORMAT_OPTIONS = ['png', 'jpeg'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState<ExtractedImage[]>([])
  const [skipped, setSkipped] = useState(0)
  const [capped, setCapped] = useState(false)
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [options, setOptions] = useState<PdfToImageExtractOptions>({ format: 'png' })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /**
   * 提取流程：大小校验 → %PDF 魔数 → pdfjs 解析 → 逐页取 operatorList →
   * 收集图片引用 → 归一化为 RGBA → 画到 canvas → 转 PNG/JPEG。
   * 单张图片失败（未解析/数据异常/超限）只计入 skipped，不中断整体。
   * 错误只存 i18n 键，渲染时才 t() 翻译。
   */
  const processFile = useCallback(async (file: File, opts: PdfToImageExtractOptions) => {
    setProgress({ current: 0, total: 0 })
    setErrorKey(null)
    setResults([])
    setSkipped(0)
    setCapped(false)
    try {
      assertFileSizeOk(file.size)
    } catch {
      setErrorKey('pdfToImageExtract.error.tooLarge')
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isPdfFile(bytes)) {
      setErrorKey('pdfToImageExtract.error.unsupported')
      return
    }
    try {
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise
      const images: ExtractedImage[] = []
      let skippedCount = 0
      let hitCap = false
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        setProgress({ current: pageNum, total: doc.numPages })
        const page = await doc.getPage(pageNum)
        const refs = collectImageRefs(await page.getOperatorList())
        for (const ref of refs) {
          if (images.length >= MAX_IMAGES) {
            hitCap = true
            break
          }
          let raw: unknown
          if (ref.kind === 'named') {
            try {
              raw = page.objs.get(ref.name)
            } catch {
              // 图片对象尚未解析或已损坏：跳过，不中断整体
              skippedCount++
              continue
            }
          } else {
            raw = ref.image
          }
          if (!isImageDataLike(raw)) {
            skippedCount++
            continue
          }
          try {
            assertImageSizeOk(raw.width, raw.height)
          } catch {
            skippedCount++
            continue
          }
          let rgba: NormalizedImage
          try {
            rgba = normalizeToRgba(raw)
          } catch {
            skippedCount++
            continue
          }
          const canvas = document.createElement('canvas')
          canvas.width = rgba.width
          canvas.height = rgba.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            setErrorKey('pdfToImageExtract.error.canvas')
            return
          }
          const imgData = ctx.createImageData(rgba.width, rgba.height)
          imgData.data.set(rgba.rgba)
          ctx.putImageData(imgData, 0, 0)
          const blob = await canvasToBlob(canvas, formatToMime(opts.format))
          const index = images.length + 1
          images.push({
            index,
            page: pageNum,
            url: URL.createObjectURL(blob),
            fileName: buildImageFileName(file.name, pageNum, index, opts.format),
            width: rgba.width,
            height: rgba.height,
            blob,
          })
        }
        if (hitCap) break
      }
      setResults(images)
      setSkipped(skippedCount)
      setCapped(hitCap)
      setFileName(file.name)
    } catch (err) {
      if (isEncryptedPdfError(err)) {
        setErrorKey('pdfToImageExtract.error.encrypted')
      } else {
        setErrorKey('pdfToImageExtract.error.invalid')
      }
      setResults([])
    } finally {
      setProgress(null)
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

  const handleOptionChange = useCallback(
    (patch: Partial<PdfToImageExtractOptions>) => {
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
    setResults([])
    setSkipped(0)
    setCapped(false)
    setFileName('')
    setErrorKey(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfToImageExtract.note')}</p>
      <p className="text-sm text-slate-500 dark:text-slate-500">
        {t('pdfToImageExtract.difference')}
      </p>

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
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfToImageExtract.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfToImageExtract.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as PdfToImageExtractOptions['format'] })
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
        {(results.length > 0 || fileName !== '') && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfToImageExtract.reset')}
          </button>
        )}
      </div>

      {progress !== null && (
        <p data-testid="processing">
          {t('pdfToImageExtract.extracting')} {progress.current}/{progress.total}{' '}
          {t('pdfToImageExtract.pageUnit')}
        </p>
      )}
      {errorKey !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(errorKey)}
        </p>
      )}

      {/* 结果：每张图独立预览与下载按钮 */}
      {results.length > 0 && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="summary" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfToImageExtract.summaryPrefix')} {results.length}{' '}
            {t('pdfToImageExtract.summarySuffix')}
          </p>
          {capped && (
            <p data-testid="capped" className="text-sm text-amber-600 dark:text-amber-400">
              {t('pdfToImageExtract.capped')}
            </p>
          )}
          {skipped > 0 && (
            <p data-testid="skipped" className="text-sm text-slate-500">
              {skipped} {t('pdfToImageExtract.skippedSuffix')}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((r) => (
              <figure key={r.index} data-testid="image-result" className="flex flex-col gap-2">
                <img src={r.url} alt="" className="max-h-64 rounded border object-contain" />
                <figcaption className="text-sm text-slate-500">
                  {t('pdfToImageExtract.image')} {r.index} · {t('pdfToImageExtract.page')} {r.page}{' '}
                  · {r.width}×{r.height}
                </figcaption>
                <button
                  data-testid="download-image"
                  type="button"
                  // results 非空才渲染此按钮，TS 已收窄，无需空守卫
                  onClick={() => downloadBlob(r.blob, r.fileName)}
                  className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  {t('pdfToImageExtract.download')}
                </button>
              </figure>
            ))}
          </div>
        </div>
      )}

      {/* 空状态：PDF 合法但无可提取的内嵌图片 */}
      {errorKey === null && progress === null && fileName !== '' && results.length === 0 && (
        <div data-testid="empty" className="flex flex-col gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfToImageExtract.empty')}
          </p>
          {skipped > 0 && (
            <p data-testid="skipped" className="text-sm text-slate-500">
              {skipped} {t('pdfToImageExtract.skippedSuffix')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
