import { useCallback, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  buildXlsxBlob,
  errorMessage,
  extractCellItems,
  groupItemsToRows,
  isEncryptedPdfError,
  isPdfFile,
} from './utils'
import type { PdfToExcelOptions } from './schema'

// pdfjs worker：与 pdfjs-dist 打包在一起的 min 版 worker，本地加载不经过网络 CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface Result {
  url: string
  blob: Blob
  fileName: string
  pageCount: number
  rowCount: number
}

interface Progress {
  current: number
  total: number
}

const SHEET_MODES: PdfToExcelOptions['sheetMode'][] = ['merged', 'perPage']

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [options, setOptions] = useState<PdfToExcelOptions>({ sheetMode: 'merged' })
  // 待重新处理的文件存在 state 里：选项变更时直接取用，避免 ref 空守卫分支
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: PdfToExcelOptions) => {
      setProgress({ current: 0, total: 0 })
      setError(null)
      setResult(null)
      try {
        assertFileSizeOk(file.size)
        const data = await file.arrayBuffer()
        if (!isPdfFile(new Uint8Array(data))) {
          throw new Error(t('pdfToExcel.error.unsupported'))
        }
        let pdf: pdfjsLib.PDFDocumentProxy
        try {
          pdf = await pdfjsLib.getDocument({ data }).promise
        } catch (err) {
          if (isEncryptedPdfError(err)) {
            throw new Error(t('pdfToExcel.error.encrypted'), { cause: err })
          }
          throw err
        }
        // 逐页提取带坐标文本并分行分列：大文件逐页更新进度，避免界面长时间无反馈
        const pages: string[][][] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({ current: i, total: pdf.numPages })
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          pages.push(groupItemsToRows(extractCellItems(content.items)))
        }
        const rowCount = pages.reduce((n, rows) => n + rows.length, 0)
        const cellCount = pages.reduce(
          (n, rows) => n + rows.reduce((m, row) => m + row.length, 0),
          0,
        )
        // 纯图片扫描版 PDF 提取不到文本：明确报错，不生成空 Excel
        if (cellCount === 0) {
          throw new Error(t('pdfToExcel.error.noText'))
        }
        const blob = buildXlsxBlob(pages, opts.sheetMode)
        const outName = buildOutputFileName(file.name)
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          fileName: outName,
          pageCount: pdf.numPages,
          rowCount,
        })
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setResult(null)
      } finally {
        setProgress(null)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      setSourceFile(file)
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<PdfToExcelOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      if (sourceFile) void processFile(sourceFile, next)
    },
    [options, processFile, sourceFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setSourceFile(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfToExcel.note')}</p>
      <p className="text-xs text-slate-500 dark:text-slate-500">{t('pdfToExcel.fidelityNote')}</p>

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
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfToExcel.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfToExcel.sheetMode')}
          <select
            data-testid="opt-sheetmode"
            value={options.sheetMode}
            onChange={(e) =>
              handleOptionChange({ sheetMode: e.target.value as PdfToExcelOptions['sheetMode'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {SHEET_MODES.map((m) => (
              <option key={m} value={m}>
                {t(m === 'merged' ? 'pdfToExcel.sheetModeMerged' : 'pdfToExcel.sheetModePerPage')}
              </option>
            ))}
          </select>
        </label>
        {(result !== null || error !== null) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfToExcel.reset')}
          </button>
        )}
      </div>

      {progress !== null && (
        <p data-testid="processing">
          {t('pdfToExcel.converting')} {progress.current}/{progress.total}{' '}
          {t('pdfToExcel.pageUnit')}
        </p>
      )}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫；下载按钮只在 result 存在时渲染 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfToExcel.resultInfo')}：{result.pageCount}
            {t('pdfToExcel.pageUnit')}，{result.rowCount}
            {t('pdfToExcel.rowUnit')}（{result.fileName}）
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfToExcel.download')}
          </button>
        </div>
      )}
    </div>
  )
}
