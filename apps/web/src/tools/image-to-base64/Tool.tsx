import { useCallback, useState } from 'react'
import { useTranslate } from '../../i18n'
import { downloadBlob, isSupportedImageFile, readFileAsDataURL } from '../../lib/image'
import {
  assertFileCountOk,
  assertFileSizeOk,
  buildCombinedFileName,
  buildCombinedText,
  buildTxtFileName,
  errorMessage,
  selectOutput,
} from './utils'
import type { ImageToBase64Options } from './schema'

interface ResultItem {
  fileName: string
  dataUrl: string
}

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [results, setResults] = useState<ResultItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copyFailedIndex, setCopyFailedIndex] = useState<number | null>(null)
  const [options, setOptions] = useState<ImageToBase64Options>({ outputKind: 'dataUrl' })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const processFiles = useCallback(
    async (fileList: File[]) => {
      setProcessing(true)
      setError(null)
      setCopiedIndex(null)
      setCopyFailedIndex(null)
      try {
        assertFileCountOk(fileList.length)
        const items: ResultItem[] = []
        const failures: string[] = []
        for (const file of fileList) {
          try {
            assertFileSizeOk(file.size)
            if (!isSupportedImageFile(file)) throw new Error(t('imageToBase64.error.unsupported'))
            const dataUrl = await readFileAsDataURL(file)
            items.push({ fileName: file.name, dataUrl })
          } catch (err) {
            failures.push(`${file.name}：${errorMessage(err)}`)
          }
        }
        setResults(items)
        if (failures.length > 0) setError(failures.join('\n'))
      } catch (err) {
        setError(errorMessage(err))
        setResults([])
      } finally {
        setProcessing(false)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      void processFiles(Array.from(files))
    },
    [processFiles],
  )

  const handleKindChange = useCallback((outputKind: ImageToBase64Options['outputKind']) => {
    // 输出文本由已存的 dataUrl 即时派生，无需重新读文件
    setOptions({ outputKind })
    setCopiedIndex(null)
    setCopyFailedIndex(null)
  }, [])

  const handleCopy = useCallback(async (index: number, text: string) => {
    setCopiedIndex(null)
    setCopyFailedIndex(null)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
    } catch {
      // 降级：提示用户手动复制下方文本框内容，不抛未处理异常
      setCopyFailedIndex(index)
    }
  }, [])

  const handleDownload = useCallback(
    (item: ResultItem, outputKind: ImageToBase64Options['outputKind']) => {
      const text = selectOutput(item.dataUrl, outputKind)
      downloadBlob(
        new Blob([text], { type: 'text/plain;charset=utf-8' }),
        buildTxtFileName(item.fileName),
      )
    },
    [],
  )

  const handleDownloadAll = useCallback(() => {
    const texts = results.map((item) => ({
      fileName: item.fileName,
      text: selectOutput(item.dataUrl, options.outputKind),
    }))
    downloadBlob(
      new Blob([buildCombinedText(texts)], { type: 'text/plain;charset=utf-8' }),
      buildCombinedFileName(results.length),
    )
  }, [results, options])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResults([])
    setError(null)
    setCopiedIndex(null)
    setCopyFailedIndex(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageToBase64.note')}</p>

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
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageToBase64.dropHint')}</p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageToBase64.outputKind')}
          <select
            data-testid="opt-kind"
            value={options.outputKind}
            onChange={(e) => handleKindChange(e.target.value as ImageToBase64Options['outputKind'])}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="dataUrl">{t('imageToBase64.kind.dataUrl')}</option>
            <option value="raw">{t('imageToBase64.kind.raw')}</option>
          </select>
        </label>
        {results.length > 0 && (
          <>
            <button
              data-testid="download-all"
              type="button"
              onClick={handleDownloadAll}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              {t('imageToBase64.downloadAll')}
            </button>
            <button
              data-testid="reset"
              type="button"
              onClick={handleReset}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('imageToBase64.reset')}
            </button>
          </>
        )}
      </div>

      {processing && <p data-testid="processing">{t('imageToBase64.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果列表：输出文本由 dataUrl 按当前输出形式派生 */}
      {results.length > 0 && (
        <ol data-testid="result-list" className="flex flex-col gap-3">
          {results.map((item, index) => {
            const output = selectOutput(item.dataUrl, options.outputKind)
            return (
              <li
                key={`${item.fileName}-${index}`}
                data-testid={`row-${index}`}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">{item.fileName}</span>
                  <span className="text-xs text-slate-500">
                    {output.length} {t('imageToBase64.charsUnit')}
                  </span>
                </div>
                <textarea
                  data-testid={`output-${index}`}
                  readOnly
                  rows={3}
                  value={output}
                  className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs break-all dark:border-slate-700 dark:bg-slate-900"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    data-testid={`copy-${index}`}
                    type="button"
                    onClick={() => void handleCopy(index, output)}
                    className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
                  >
                    {copiedIndex === index ? t('imageToBase64.copied') : t('imageToBase64.copy')}
                  </button>
                  <button
                    data-testid={`download-${index}`}
                    type="button"
                    onClick={() => handleDownload(item, options.outputKind)}
                    className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
                  >
                    {t('imageToBase64.downloadTxt')}
                  </button>
                </div>
                {copyFailedIndex === index && (
                  <p
                    data-testid={`copy-error-${index}`}
                    className="text-sm text-amber-600 dark:text-amber-400"
                  >
                    {t('imageToBase64.copyFailed')}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
