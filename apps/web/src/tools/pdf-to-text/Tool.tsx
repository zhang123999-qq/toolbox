import { useCallback, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  extractPageText,
  isPasswordPdfError,
  isPdfFile,
  joinPageTexts,
} from './utils'

// pdfjs worker：与 pdfjs-dist 打包在一起的 min 版 worker，本地加载不经过网络 CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
interface PageText {
  page: number
  text: string
}

interface Result {
  pages: PageText[]
  text: string
  blob: Blob
  fileName: string
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
  const [copied, setCopied] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File) => {
      setError(null)
      setResult(null)
      setCopied(false)
      try {
        assertFileSizeOk(file.size)
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(bytes)) throw new Error(t('pdfToText.error.unsupported'))
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise
        const pages: PageText[] = []
        setProgress({ current: 0, total: doc.numPages })
        for (let n = 1; n <= doc.numPages; n++) {
          setProgress({ current: n, total: doc.numPages })
          const page = await doc.getPage(n)
          const content = await page.getTextContent()
          pages.push({ page: n, text: extractPageText(content.items) })
        }
        const text = joinPageTexts(pages.map((p) => p.text))
        setResult({
          pages,
          text,
          blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
          fileName: buildOutputFileName(file.name),
        })
        setFileName(file.name)
      } catch (err) {
        // 加密 PDF：pdfjs 抛 PasswordException，明确提示而非通用解析错误
        if (isPasswordPdfError(err)) setError(t('pdfToText.error.encrypted'))
        else setError(errorMessage(err))
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

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        const clipboard = navigator.clipboard
        if (!clipboard) throw new Error(t('pdfToText.error.copyFailed'))
        await clipboard.writeText(text)
        setCopied(true)
      } catch (err) {
        setCopied(false)
        setError(errorMessage(err))
      }
    },
    [t],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setFileName('')
    setError(null)
    setCopied(false)
  }, [])

  // 是否提取到任何文本：空页 join 后仍会产生分页符，不能只看 text 是否为空串
  const hasText = result !== null && result.pages.some((p) => p.text !== '')

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfToText.note')}</p>

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
          {fileName ? fileName : t('pdfToText.dropHint')}
        </p>
      </label>

      {/* 大文件逐页进度 */}
      {progress !== null && (
        <p data-testid="processing">
          {t('pdfToText.extracting')} {progress.current}/{progress.total} {t('pdfToText.pageUnit')}
        </p>
      )}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfToText.pageCount')}
            {result.pages.length} · {t('pdfToText.charCount')}
            {result.text.length}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="copy"
              type="button"
              onClick={() => void handleCopy(result.text)}
              className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              {t('pdfToText.copy')}
            </button>
            {/* 有可下载文本时才渲染下载按钮 */}
            {hasText && (
              <button
                data-testid="download"
                type="button"
                onClick={() => downloadBlob(result.blob, result.fileName)}
                className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                {t('pdfToText.download')}
              </button>
            )}
            <button
              data-testid="reset"
              type="button"
              onClick={handleReset}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('pdfToText.reset')}
            </button>
          </div>
          {copied && (
            <p data-testid="copied" className="text-sm text-green-600 dark:text-green-400">
              {t('pdfToText.copied')}
            </p>
          )}

          {/* 逐页预览：空文本页显示占位；整篇无文本显示空状态 */}
          {!hasText ? (
            <p data-testid="empty-result" className="text-sm text-slate-500 dark:text-slate-400">
              {t('pdfToText.emptyResult')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {result.pages.map((p) => (
                <section
                  key={p.page}
                  data-testid="page-block"
                  className="rounded border border-slate-200 p-3 dark:border-slate-700"
                >
                  <h3 className="mb-1 text-sm font-medium text-slate-500">
                    {t('pdfToText.page')} {p.page}
                  </h3>
                  {p.text === '' ? (
                    <p data-testid="empty-page" className="text-sm text-slate-400">
                      {t('pdfToText.emptyPage')}
                    </p>
                  ) : (
                    <pre
                      data-testid="page-text"
                      className="max-h-64 overflow-auto whitespace-pre-wrap text-sm"
                    >
                      {p.text}
                    </pre>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
