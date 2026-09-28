import { useCallback, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import {
  assertFileSizeOk,
  buildDocxDocument,
  buildOutputFileName,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  packDocxToBlob,
  textItemsToLines,
} from './utils'

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
}

interface Progress {
  current: number
  total: number
}

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File) => {
      setProgress({ current: 0, total: 0 })
      setError(null)
      setResult(null)
      try {
        assertFileSizeOk(file.size)
        const data = await file.arrayBuffer()
        if (!isPdfFile(new Uint8Array(data))) {
          throw new Error(t('pdfToWord.error.unsupported'))
        }
        let pdf: pdfjsLib.PDFDocumentProxy
        try {
          pdf = await pdfjsLib.getDocument({ data }).promise
        } catch (err) {
          if (isEncryptedPdfError(err)) {
            throw new Error(t('pdfToWord.error.encrypted'), { cause: err })
          }
          throw err
        }
        // 逐页提取文本：大文件逐页更新进度，避免界面长时间无反馈
        const pages: string[][] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({ current: i, total: pdf.numPages })
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          pages.push(textItemsToLines(content.items))
        }
        const doc = buildDocxDocument(pages)
        const blob = await packDocxToBlob(doc)
        const outName = buildOutputFileName(file.name)
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          fileName: outName,
          pageCount: pdf.numPages,
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
      void processFile(file)
    },
    [processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfToWord.note')}</p>
      <p className="text-xs text-slate-500 dark:text-slate-500">{t('pdfToWord.fidelityNote')}</p>

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
          {fileName ? fileName : t('pdfToWord.dropHint')}
        </p>
      </label>

      {/* 操作区：结果或错误存在时才允许重新选择 */}
      <div className="flex flex-wrap gap-4">
        {(result !== null || error !== null) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfToWord.reset')}
          </button>
        )}
      </div>

      {progress !== null && (
        <p data-testid="processing">
          {t('pdfToWord.converting')} {progress.current}/{progress.total} {t('pdfToWord.pageUnit')}
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
            {t('pdfToWord.resultInfo')}：{result.pageCount}
            {t('pdfToWord.pageUnit')}（{result.fileName}）
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfToWord.download')}
          </button>
        </div>
      )}
    </div>
  )
}
