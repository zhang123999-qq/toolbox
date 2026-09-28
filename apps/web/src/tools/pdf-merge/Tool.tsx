import { useCallback, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { useTranslate } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  mergePdfs,
  moveItem,
  removeItem,
  tryGetPageCount,
} from './utils'

interface PdfItem {
  id: string
  file: File
  bytes: Uint8Array
  pageCount: number | null
}

interface Result {
  url: string
  blob: Blob
  fileName: string
  pageCount: number
}

export default function Tool() {
  const t = useTranslate()
  const idRef = useRef(0)
  const [dragOver, setDragOver] = useState(false)
  const [items, setItems] = useState<PdfItem[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const handleFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return
    setError(null)
    const next: PdfItem[] = []
    for (const file of Array.from(incoming)) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pageCount = await tryGetPageCount(bytes)
      next.push({ id: `pdf-${idRef.current++}`, file, bytes, pageCount })
    }
    setItems((prev) => [...prev, ...next])
  }, [])

  const move = useCallback((index: number, dir: -1 | 1) => {
    setItems((prev) => moveItem(prev, index, dir))
  }, [])

  const remove = useCallback((index: number) => {
    setItems((prev) => removeItem(prev, index))
  }, [])

  const handleClear = useCallback(() => {
    setInputKey((k) => k + 1)
    setItems([])
    setResult(null)
    setError(null)
  }, [])

  /**
   * 逐文件校验：大小 → 魔数 → 可解析（加密单独转译）。
   * 任一失败由合并流程整体报错并指出文件名。
   */
  const validateItem = useCallback(
    async (item: PdfItem): Promise<Uint8Array> => {
      assertFileSizeOk(item.file.size)
      if (!isPdfFile(item.bytes)) throw new Error(t('pdfMerge.error.unsupported'))
      try {
        await PDFDocument.load(item.bytes)
      } catch (err) {
        if (isEncryptedPdfError(err)) throw new Error(t('pdfMerge.error.encrypted'), { cause: err })
        throw new Error(t('pdfMerge.error.invalid'), { cause: err })
      }
      return item.bytes
    },
    [t],
  )

  const merge = useCallback(async () => {
    // 调用方按钮在 items.length < 2 时禁用，此处无需重复守卫
    setProcessing(true)
    setError(null)
    try {
      const buffers: Uint8Array[] = []
      for (const item of items) {
        try {
          buffers.push(await validateItem(item))
        } catch (err) {
          throw new Error(`${errorMessage(err)}：${item.file.name}`, { cause: err })
        }
      }
      const mergedBytes = await mergePdfs(buffers)
      // mergePdfs 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
      const pdfCopy = new Uint8Array(mergedBytes)
      const blob = new Blob([pdfCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
      const check = await PDFDocument.load(mergedBytes)
      setResult({
        url: URL.createObjectURL(blob),
        blob,
        fileName: buildOutputFileName(items[0].file.name),
        pageCount: check.getPageCount(),
      })
    } catch (err) {
      setError(errorMessage(err))
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }, [items, validateItem])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfMerge.note')}</p>

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
          void handleFiles(e.dataTransfer.files)
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
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
          }}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfMerge.dropHint')}</p>
      </label>

      {/* 操作区 */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          data-testid="merge"
          type="button"
          disabled={items.length < 2}
          onClick={() => void merge()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {t('pdfMerge.merge')}
        </button>
        {(items.length > 0 || result) && (
          <button
            data-testid="clear"
            type="button"
            onClick={handleClear}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfMerge.clear')}
          </button>
        )}
      </div>
      {items.length < 2 && (
        <p data-testid="need-two" className="text-sm text-slate-500 dark:text-slate-400">
          {t('pdfMerge.needTwo')}
        </p>
      )}

      {/* PDF 列表 */}
      {items.length === 0 ? (
        <p data-testid="empty-hint" className="text-sm text-slate-500 dark:text-slate-400">
          {t('pdfMerge.emptyHint')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfMerge.fileList')}：{items.length}
            {t('pdfMerge.fileUnit')}
          </p>
          <ul data-testid="file-list" className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                data-testid="file-item"
                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <span className="flex-1 truncate text-sm">{item.file.name}</span>
                <span data-testid="page-count" className="text-xs text-slate-500">
                  {item.pageCount === null
                    ? t('pdfMerge.unknownPages')
                    : `${item.pageCount}${t('pdfMerge.pageUnit')}`}
                </span>
                <span className="text-xs text-slate-500">{formatBytes(item.file.size)}</span>
                <button
                  data-testid="move-up"
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('pdfMerge.moveUp')}
                </button>
                <button
                  data-testid="move-down"
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('pdfMerge.moveDown')}
                </button>
                <button
                  data-testid="remove"
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('pdfMerge.remove')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {processing && <p data-testid="processing">{t('pdfMerge.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfMerge.resultInfo')}：{result.pageCount}
            {t('pdfMerge.pageUnit')}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfMerge.download')}
          </button>
        </div>
      )}
    </div>
  )
}
