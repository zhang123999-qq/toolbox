import { useCallback, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { useTranslate } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  addPageNumbers,
  assertFileSizeOk,
  assertFromPageInRange,
  assertPdfFile,
  buildOutputFileName,
  errorMessage,
  loadErrorMessage,
  parseFontSize,
  parseFromPage,
  parseMargin,
  parseStartNumber,
} from './utils'
import type { PdfPageNumberOptions } from './schema'

interface StagedFile {
  bytes: Uint8Array
  name: string
  pageCount: number
}

interface Result {
  url: string
  blob: Blob
  fileName: string
  stampedPages: number
}

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<PdfPageNumberOptions>({
    position: 'bottomCenter',
    style: 'n',
    startNumber: '1',
    fromPage: '1',
    fontSize: '12',
    margin: '36',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /** 上传阶段：大小 → 魔数 → 可解析（加密单独转译），只做校验与页数读取 */
  const handleFiles = useCallback(async (incoming: FileList | null) => {
    const file = incoming?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    try {
      assertFileSizeOk(file.size)
      const bytes = new Uint8Array(await file.arrayBuffer())
      assertPdfFile(bytes)
      try {
        const doc = await PDFDocument.load(bytes, { updateMetadata: false })
        setStaged({ bytes, name: file.name, pageCount: doc.getPageCount() })
      } catch (err) {
        throw new Error(loadErrorMessage(err), { cause: err })
      }
    } catch (err) {
      setError(errorMessage(err))
      setStaged(null)
    }
  }, [])

  /**
   * 添加页码：解析选项 → 起始页范围校验 → 绘制 → 下载。
   * 按钮仅在 staged 非空时渲染，参数已收窄，无需空守卫。
   */
  const handleAdd = useCallback(
    async (current: StagedFile) => {
      setProcessing(true)
      setError(null)
      try {
        const startNumber = parseStartNumber(options.startNumber)
        const fromPage = parseFromPage(options.fromPage)
        const fontSize = parseFontSize(options.fontSize)
        const margin = parseMargin(options.margin)
        assertFromPageInRange(fromPage, current.pageCount)
        const stamped = await addPageNumbers(current.bytes, {
          position: options.position,
          style: options.style,
          startNumber,
          fromPage,
          fontSize,
          margin,
        })
        // addPageNumbers 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
        const pdfCopy = new Uint8Array(stamped)
        const blob = new Blob([pdfCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          fileName: buildOutputFileName(current.name),
          stampedPages: current.pageCount - fromPage + 1,
        })
      } catch (err) {
        setError(errorMessage(err))
        setResult(null)
      } finally {
        setProcessing(false)
      }
    },
    [options],
  )

  const handleOptionChange = useCallback((patch: Partial<PdfPageNumberOptions>) => {
    // 选项变更后旧结果失效，直接清空，避免用户下载到过期文件
    setOptions((prev) => ({ ...prev, ...patch }))
    setResult(null)
  }, [])

  const handleClear = useCallback(() => {
    setInputKey((k) => k + 1)
    setStaged(null)
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfPageNumber.note')}</p>

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
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfPageNumber.dropHint')}</p>
      </label>

      {/* 已选文件信息 */}
      {staged && (
        <p data-testid="file-info" className="text-sm text-slate-600 dark:text-slate-400">
          {staged.name}（{staged.pageCount}
          {t('pdfPageNumber.pageUnit')}，{formatBytes(staged.bytes.length)}）
        </p>
      )}

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfPageNumber.position')}
          <select
            data-testid="opt-position"
            value={options.position}
            onChange={(e) =>
              handleOptionChange({
                position: e.target.value as PdfPageNumberOptions['position'],
              })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="topLeft">{t('pdfPageNumber.position.topLeft')}</option>
            <option value="topCenter">{t('pdfPageNumber.position.topCenter')}</option>
            <option value="topRight">{t('pdfPageNumber.position.topRight')}</option>
            <option value="bottomLeft">{t('pdfPageNumber.position.bottomLeft')}</option>
            <option value="bottomCenter">{t('pdfPageNumber.position.bottomCenter')}</option>
            <option value="bottomRight">{t('pdfPageNumber.position.bottomRight')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfPageNumber.style')}
          <select
            data-testid="opt-style"
            value={options.style}
            onChange={(e) =>
              handleOptionChange({ style: e.target.value as PdfPageNumberOptions['style'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="n">{t('pdfPageNumber.style.n')}</option>
            <option value="nOfN">{t('pdfPageNumber.style.nOfN')}</option>
            <option value="page">{t('pdfPageNumber.style.page')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfPageNumber.startNumber')}
          <input
            data-testid="opt-start"
            type="number"
            min={0}
            value={options.startNumber}
            onChange={(e) => handleOptionChange({ startNumber: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfPageNumber.fromPage')}
          <input
            data-testid="opt-from"
            type="number"
            min={1}
            value={options.fromPage}
            onChange={(e) => handleOptionChange({ fromPage: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfPageNumber.fontSize')}
          <input
            data-testid="opt-size"
            type="number"
            min={6}
            max={72}
            value={options.fontSize}
            onChange={(e) => handleOptionChange({ fontSize: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfPageNumber.margin')}
          <input
            data-testid="opt-margin"
            type="number"
            min={0}
            max={200}
            value={options.margin}
            onChange={(e) => handleOptionChange({ margin: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>

      {/* 操作区：添加按钮仅在文件就绪时渲染，TS 已收窄 */}
      <div className="flex flex-wrap items-center gap-4">
        {staged && (
          <button
            data-testid="add"
            type="button"
            disabled={processing}
            onClick={() => void handleAdd(staged)}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t('pdfPageNumber.add')}
          </button>
        )}
        {staged && (
          <button
            data-testid="clear"
            type="button"
            onClick={handleClear}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfPageNumber.clear')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('pdfPageNumber.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfPageNumber.resultInfo')}：{result.stampedPages}
            {t('pdfPageNumber.pageUnit')}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfPageNumber.download')}
          </button>
        </div>
      )}
    </div>
  )
}
