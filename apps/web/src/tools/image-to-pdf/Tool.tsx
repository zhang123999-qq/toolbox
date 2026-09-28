import { useCallback, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  computePageSize,
  detectEmbedKind,
  errorMessage,
  moveItem,
  parseMarginMm,
  removeItem,
} from './utils'
import type { ImageToPdfOptions } from './schema'

interface PdfFileItem {
  id: string
  file: File
}

interface Result {
  url: string
  blob: Blob
  fileName: string
  pageCount: number
}

const PAGE_SIZE_OPTIONS = ['fit', 'a4', 'letter'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(0)
  const [dragOver, setDragOver] = useState(false)
  const [files, setFiles] = useState<PdfFileItem[]>([])
  const [options, setOptions] = useState<ImageToPdfOptions>({ pageSize: 'fit', margin: '0' })
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return
      const list = Array.from(incoming)
      try {
        for (const file of list) {
          assertFileSizeOk(file.size)
          if (!isSupportedImageFile(file)) {
            throw new Error(`${t('imageToPdf.error.unsupported')}：${file.name}`)
          }
        }
      } catch (err) {
        setError(errorMessage(err))
        return
      }
      setError(null)
      setFiles((prev) => [...prev, ...list.map((file) => ({ id: `img-${idRef.current++}`, file }))])
    },
    [t],
  )

  const move = useCallback((index: number, dir: -1 | 1) => {
    setFiles((prev) => moveItem(prev, index, dir))
  }, [])

  const remove = useCallback((index: number) => {
    setFiles((prev) => removeItem(prev, index))
  }, [])

  const handleClear = useCallback(() => {
    setInputKey((k) => k + 1)
    setFiles([])
    setResult(null)
    setError(null)
  }, [])

  const handleOptionChange = useCallback((patch: Partial<ImageToPdfOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  const generate = useCallback(async () => {
    if (files.length === 0) return
    setProcessing(true)
    setError(null)
    try {
      const margin = parseMarginMm(options.margin)
      const doc = await PDFDocument.create()
      for (const item of files) {
        const kind = detectEmbedKind(item.file.type)
        const img = await loadImageFromBlob(item.file)
        const { pageW, pageH, drawW, drawH, x, y } = computePageSize(
          options.pageSize,
          img.width,
          img.height,
          margin,
        )
        if (kind === 'jpg') {
          const bytes = new Uint8Array(await item.file.arrayBuffer())
          const embedded = await doc.embedJpg(bytes)
          const page = doc.addPage([pageW, pageH])
          page.drawImage(embedded, { x, y, width: drawW, height: drawH })
        } else if (kind === 'png') {
          const bytes = new Uint8Array(await item.file.arrayBuffer())
          const embedded = await doc.embedPng(bytes)
          const page = doc.addPage([pageW, pageH])
          page.drawImage(embedded, { x, y, width: drawW, height: drawH })
        } else {
          // webp/gif/bmp/avif 等先经 Canvas 转 PNG 再嵌入
          const canvas = drawScaled(img, img.width, img.height, img.width, img.height)
          const pngBlob = await canvasToBlob(canvas, 'image/png')
          const embedded = await doc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()))
          const page = doc.addPage([pageW, pageH])
          page.drawImage(embedded, { x, y, width: drawW, height: drawH })
        }
      }
      const pdfBytes = await doc.save()
      // pdf-lib save() 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
      const pdfCopy = new Uint8Array(pdfBytes)
      const blob = new Blob([pdfCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
      setResult({
        url: URL.createObjectURL(blob),
        blob,
        fileName: buildOutputFileName(files[0].file.name),
        pageCount: files.length,
      })
    } catch (err) {
      setError(errorMessage(err))
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }, [files, options])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageToPdf.note')}</p>

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
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageToPdf.dropHint')}</p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageToPdf.pageSize')}
          <select
            data-testid="opt-pagesize"
            value={options.pageSize}
            onChange={(e) =>
              handleOptionChange({ pageSize: e.target.value as ImageToPdfOptions['pageSize'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {PAGE_SIZE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 'fit'
                  ? t('imageToPdf.pageSizeFit')
                  : m === 'a4'
                    ? t('imageToPdf.pageSizeA4')
                    : t('imageToPdf.pageSizeLetter')}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageToPdf.margin')}
          <input
            data-testid="opt-margin"
            type="number"
            min={0}
            max={50}
            value={options.margin}
            onChange={(e) => handleOptionChange({ margin: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="text-slate-500">{t('imageToPdf.marginUnit')}</span>
        </label>
        <button
          data-testid="generate"
          type="button"
          onClick={() => void generate()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          {t('imageToPdf.generate')}
        </button>
        {(files.length > 0 || result) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleClear}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageToPdf.clear')}
          </button>
        )}
      </div>

      {/* 图片列表 */}
      {files.length === 0 ? (
        <p data-testid="empty-hint" className="text-sm text-slate-500 dark:text-slate-400">
          {t('imageToPdf.emptyHint')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageToPdf.fileList')}：{files.length}
            {t('imageToPdf.imageUnit')}
          </p>
          <ul data-testid="file-list" className="flex flex-col gap-2">
            {files.map((item, index) => (
              <li
                key={item.id}
                data-testid="file-item"
                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <span className="flex-1 truncate text-sm">{item.file.name}</span>
                <span className="text-xs text-slate-500">{formatBytes(item.file.size)}</span>
                <button
                  data-testid="move-up"
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('imageToPdf.moveUp')}
                </button>
                <button
                  data-testid="move-down"
                  type="button"
                  disabled={index === files.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('imageToPdf.moveDown')}
                </button>
                <button
                  data-testid="remove"
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('imageToPdf.remove')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {processing && <p data-testid="processing">{t('imageToPdf.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageToPdf.resultInfo')}：{result.pageCount}
            {t('imageToPdf.pageUnit')}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('imageToPdf.download')}
          </button>
        </div>
      )}
    </div>
  )
}
