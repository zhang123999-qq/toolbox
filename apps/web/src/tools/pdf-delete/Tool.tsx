import { useCallback, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import { canvasToBlob, downloadBlob } from '../../lib/image'
import {
  MANY_PAGES_WARN,
  assertFileSizeOk,
  buildOutputFileName,
  deleteBlockReason,
  deletePages,
  errorMessage,
  invertSelection,
  isPdfFile,
  parsePageSelection,
  selectAll,
  toggleInSet,
} from './utils'

// pdfjs worker：与 pdfjs-dist 打包在一起的 min 版 worker，本地加载不经过网络 CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** 缩略图渲染缩放：小图预览即可，大文档更快 */
const THUMB_SCALE = 0.5

interface Thumb {
  page: number
  url: string
}

interface Progress {
  current: number
  total: number
}

interface Result {
  url: string
  fileName: string
  blob: Blob
  kept: number
  removed: number
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  // 已创建的 object URL，重置/重传时统一释放，避免内存泄漏
  const urlsRef = useRef<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [pages, setPages] = useState<Thumb[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [srcBytes, setSrcBytes] = useState<Uint8Array>(new Uint8Array(0))
  const [range, setRange] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const revokeAllUrls = useCallback(() => {
    for (const u of urlsRef.current) URL.revokeObjectURL(u)
    urlsRef.current = []
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      setProgress({ current: 0, total: 0 })
      setError(null)
      setResult(null)
      setPages([])
      setSelected([])
      setRange('')
      setRangeError(null)
      revokeAllUrls()
      try {
        assertFileSizeOk(file.size)
        const buf = await file.arrayBuffer()
        const data = new Uint8Array(buf)
        if (!isPdfFile(data)) throw new Error(t('pdfDelete.error.unsupported'))
        // pdfjs 可能转移底层 buffer，先拷贝一份留给删除阶段使用
        setSrcBytes(data.slice())
        const doc = await pdfjsLib.getDocument({ data: buf }).promise
        const thumbs: Thumb[] = []
        for (let n = 1; n <= doc.numPages; n++) {
          setProgress({ current: n, total: doc.numPages })
          const page = await doc.getPage(n)
          const viewport = page.getViewport({ scale: THUMB_SCALE })
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(viewport.width))
          canvas.height = Math.max(1, Math.round(viewport.height))
          await page.render({ canvas, viewport }).promise
          const blob = await canvasToBlob(canvas, 'image/png')
          const url = URL.createObjectURL(blob)
          urlsRef.current.push(url)
          thumbs.push({ page: n, url })
        }
        setPages(thumbs)
        setFileName(file.name)
      } catch (err) {
        // 加密 PDF：pdfjs 抛 PasswordException，明确提示而非通用解析错误
        if (err instanceof Error && err.name === 'PasswordException') {
          setError(t('pdfDelete.error.encrypted'))
        } else {
          setError(errorMessage(err))
        }
        setPages([])
      } finally {
        setProgress(null)
      }
    },
    [revokeAllUrls, t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      void processFile(file)
    },
    [processFile],
  )

  const togglePage = useCallback((page: number) => {
    setSelected((prev) => toggleInSet(prev, page))
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelected(selectAll(pages.length))
  }, [pages.length])

  const handleInvert = useCallback(() => {
    setSelected((prev) => invertSelection(prev, pages.length))
  }, [pages.length])

  const applyRange = useCallback(() => {
    try {
      setSelected(parsePageSelection(range, pages.length))
      setRangeError(null)
    } catch (err) {
      setRangeError(errorMessage(err))
    }
  }, [range, pages.length])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    setError(null)
    try {
      // 删除按钮在未选/全选时禁用，能走到这里 keep 必非空，无需空守卫
      const keep = pages.map((p) => p.page).filter((n) => !selected.includes(n))
      const out = await deletePages(srcBytes, keep)
      // pdf-lib save() 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
      const outCopy = new Uint8Array(out)
      const blob = new Blob([outCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      urlsRef.current.push(url)
      setResult({
        url,
        blob,
        fileName: buildOutputFileName(fileName),
        kept: keep.length,
        removed: selected.length,
      })
    } catch (err) {
      setError(errorMessage(err))
      setResult(null)
    } finally {
      setDeleting(false)
    }
  }, [pages, selected, srcBytes, fileName])

  const handleReset = useCallback(() => {
    revokeAllUrls()
    setInputKey((k) => k + 1)
    setResult(null)
    setPages([])
    setSelected([])
    setSrcBytes(new Uint8Array(0))
    setFileName('')
    setRange('')
    setRangeError(null)
    setError(null)
  }, [revokeAllUrls])

  const blockReason = deleteBlockReason(selected.length, pages.length)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfDelete.note')}</p>

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
          {fileName ? fileName : t('pdfDelete.dropHint')}
        </p>
      </label>

      {/* 页面缩略图选择区 */}
      {pages.length > 0 && (
        <div className="flex flex-col gap-3">
          <p data-testid="page-count" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfDelete.pageCount', { count: pages.length })}
          </p>
          {pages.length > MANY_PAGES_WARN && (
            <p data-testid="perf-warn" className="text-sm text-amber-600 dark:text-amber-400">
              {t('pdfDelete.perfWarn', { count: pages.length })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid="select-all"
              type="button"
              onClick={handleSelectAll}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('pdfDelete.selectAll')}
            </button>
            <button
              data-testid="invert"
              type="button"
              onClick={handleInvert}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('pdfDelete.invert')}
            </button>
            <label className="flex items-center gap-2 text-sm">
              {t('pdfDelete.rangeLabel')}
              <input
                data-testid="range-input"
                type="text"
                value={range}
                placeholder={t('pdfDelete.rangeHint')}
                onChange={(e) => setRange(e.target.value)}
                className="w-32 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
              <button
                data-testid="range-apply"
                type="button"
                onClick={applyRange}
                className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
              >
                {t('pdfDelete.rangeApply')}
              </button>
            </label>
            <span
              data-testid="selected-count"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              {t('pdfDelete.selectedCount', { selected: selected.length, total: pages.length })}
            </span>
          </div>
          {rangeError !== null && (
            <p
              data-testid="range-error"
              role="alert"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {rangeError}
            </p>
          )}
          <div data-testid="page-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pages.map((p) => (
              <label
                key={p.page}
                data-testid="page-item"
                className={`flex cursor-pointer flex-col items-center gap-1 rounded border p-2 ${
                  selected.includes(p.page)
                    ? 'border-red-500 bg-red-50 dark:bg-red-950'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                <input
                  data-testid="page-check"
                  type="checkbox"
                  checked={selected.includes(p.page)}
                  onChange={() => togglePage(p.page)}
                  className="self-start"
                />
                <img src={p.url} alt="" className="max-h-40 rounded object-contain" />
                <span className="text-xs text-slate-500">{t('pdfDelete.page', { n: p.page })}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button
              data-testid="delete"
              type="button"
              disabled={blockReason !== null}
              onClick={() => void handleDelete()}
              className="w-fit rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pdfDelete.delete')}
            </button>
            {blockReason !== null && (
              <p data-testid="delete-hint" className="text-sm text-amber-600 dark:text-amber-400">
                {blockReason === 'all' ? t('pdfDelete.hint.all') : t('pdfDelete.hint.none')}
              </p>
            )}
          </div>
        </div>
      )}

      {progress !== null && (
        <p data-testid="processing">
          {t('pdfDelete.rendering', { current: progress.current, total: progress.total })}
        </p>
      )}
      {deleting && <p data-testid="deleting">{t('pdfDelete.deleting')}</p>}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：只在 result 存在时渲染下载按钮 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfDelete.resultInfo', { kept: result.kept, removed: result.removed })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfDelete.download')}
          </button>
        </div>
      )}

      {pages.length > 0 && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('pdfDelete.reset')}
        </button>
      )}
    </div>
  )
}
