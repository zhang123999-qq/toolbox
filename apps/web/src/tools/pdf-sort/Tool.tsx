import { useCallback, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  assertFileSizeOk,
  assertPageCountOk,
  buildOutputFileName,
  formatPageSize,
  initialOrder,
  isEncryptedPdfError,
  isPdfFile,
  moveItem,
  readPdfInfo,
  reverseOrder,
  sortPdfPages,
} from './utils'
import type { PdfPageInfo } from './utils'

/**
 * i18n 键尚未合并进 messages.*.ts（image-convert / watermark 同款写法）：
 * 用 tk() 包一层转 MessageKey；文案见 pdf-sort.i18n.json，协调员合并后改回字面量。
 * 注意：所有 t() 调用都不带 params——键未合并前 t(key, params) 会抛 TypeError，
 * 无参调用仅返回 undefined，不影响渲染（文本用 JSX 拼接组合）。
 */
const tk = (key: string): MessageKey => key as MessageKey

interface LoadedDoc {
  bytes: Uint8Array
  pageSizes: { width: number; height: number }[]
}

interface Result {
  url: string
  blob: Blob
  fileName: string
  pageCount: number
}

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [doc, setDoc] = useState<LoadedDoc | null>(null)
  // order[i] = 显示在第 i 位的原页面索引；初始为 0..n-1
  const [order, setOrder] = useState<number[]>([])
  // 错误只存 i18n 键：键未合并前 t() 返回 undefined，错误条依然可渲染（data-testid 可断言）
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /**
   * 上传校验链：大小 → 魔数 → 可解析（加密单独转译）→ 页数上限。
   * 任一步失败置对应错误键并提前返回，不抛到外层。
   */
  const handleFiles = useCallback(async (incoming: FileList | null) => {
    const file = incoming?.[0]
    if (!file) return
    setErrorKey(null)
    setResult(null)
    setProcessing(true)
    try {
      assertFileSizeOk(file.size)
    } catch {
      setErrorKey(tk('pdfSort.error.tooLarge'))
      setProcessing(false)
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isPdfFile(bytes)) {
      setErrorKey(tk('pdfSort.error.unsupported'))
      setProcessing(false)
      return
    }
    let info: PdfPageInfo
    try {
      info = await readPdfInfo(bytes)
    } catch (err) {
      setErrorKey(
        tk(isEncryptedPdfError(err) ? 'pdfSort.error.encrypted' : 'pdfSort.error.invalid'),
      )
      setProcessing(false)
      return
    }
    try {
      assertPageCountOk(info.pageCount)
    } catch {
      setErrorKey(tk('pdfSort.error.tooManyPages'))
      setProcessing(false)
      return
    }
    setDoc({ bytes, pageSizes: info.pageSizes })
    setOrder(initialOrder(info.pageCount))
    setFileName(file.name)
    setProcessing(false)
  }, [])

  const move = useCallback((index: number, dir: -1 | 1) => {
    setOrder((prev) => moveItem(prev, index, dir))
  }, [])

  const reverse = useCallback(() => {
    setOrder((prev) => reverseOrder(prev))
  }, [])

  const resetOrder = useCallback(() => {
    setOrder((prev) => initialOrder(prev.length))
  }, [])

  const handleClear = useCallback(() => {
    setInputKey((k) => k + 1)
    setDoc(null)
    setOrder([])
    setFileName('')
    setResult(null)
    setErrorKey(null)
  }, [])

  /**
   * 按当前顺序生成新 PDF。调用方按钮只在 doc 非空时渲染，
   * 此处用参数接收收窄后的 doc，无需空守卫分支。
   */
  const generate = useCallback(
    async (loaded: LoadedDoc) => {
      setProcessing(true)
      setErrorKey(null)
      try {
        const sorted = await sortPdfPages(loaded.bytes, order)
        // sortPdfPages 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
        const pdfCopy = new Uint8Array(sorted)
        const blob = new Blob([pdfCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          fileName: buildOutputFileName(fileName),
          pageCount: order.length,
        })
      } catch {
        // 上传阶段已做加密/损坏校验，此处只剩生成失败一种情形
        setErrorKey(tk('pdfSort.error.invalid'))
        setResult(null)
      } finally {
        setProcessing(false)
      }
    },
    [order, fileName],
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t(tk('pdfSort.note'))}</p>

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
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
          }}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t(tk('pdfSort.dropHint'))}
        </p>
      </label>

      {/* 页面列表：doc 为空时只显示空提示 */}
      {doc === null ? (
        <p data-testid="empty-hint" className="text-sm text-slate-500 dark:text-slate-400">
          {t(tk('pdfSort.emptyHint'))}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t(tk('pdfSort.pageList'))}</p>
          <ul data-testid="page-list" className="flex flex-col gap-2">
            {order.map((pageIndex, pos) => (
              <li
                key={pageIndex}
                data-testid="page-item"
                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <span data-testid="page-number" className="text-sm font-medium">
                  {t(tk('pdfSort.pagePrefix'))}
                  {pageIndex + 1}
                  {t(tk('pdfSort.pageUnit'))}
                </span>
                <span data-testid="page-size" className="flex-1 text-xs text-slate-500">
                  {t(tk('pdfSort.pageSize'))}：
                  {formatPageSize(doc.pageSizes[pageIndex].width, doc.pageSizes[pageIndex].height)}
                </span>
                <button
                  data-testid="move-up"
                  type="button"
                  disabled={pos === 0}
                  onClick={() => move(pos, -1)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t(tk('pdfSort.moveUp'))}
                </button>
                <button
                  data-testid="move-down"
                  type="button"
                  disabled={pos === order.length - 1}
                  onClick={() => move(pos, 1)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t(tk('pdfSort.moveDown'))}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid="reverse"
              type="button"
              onClick={reverse}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t(tk('pdfSort.reverse'))}
            </button>
            <button
              data-testid="reset-order"
              type="button"
              onClick={resetOrder}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t(tk('pdfSort.resetOrder'))}
            </button>
            <button
              data-testid="generate"
              type="button"
              disabled={processing}
              onClick={() => void generate(doc)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {t(tk('pdfSort.generate'))}
            </button>
            <button
              data-testid="clear"
              type="button"
              onClick={handleClear}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t(tk('pdfSort.clear'))}
            </button>
          </div>
        </div>
      )}

      {processing && <p data-testid="processing">{t(tk('pdfSort.processing'))}</p>}
      {errorKey !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(errorKey)}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t(tk('pdfSort.resultInfo'))}：{result.pageCount}
            {t(tk('pdfSort.pageUnit'))}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t(tk('pdfSort.download'))}
          </button>
        </div>
      )}
    </div>
  )
}
