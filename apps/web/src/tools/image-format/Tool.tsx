import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import {
  HEAD_BYTES,
  assertFileCountOk,
  assertFileSizeOk,
  buildReportText,
  checkConsistency,
  conclusionText,
  detectFormatByMagic,
  errorMessage,
  formatLabel,
  type FormatCheckItem,
  type ReportLabels,
} from './utils'

const REPORT_FILE_NAME = 'image-format-report.txt'

/** 只读文件头（前 HEAD_BYTES 字节），不解码图片 */
async function readFileHead(file: File): Promise<Uint8Array> {
  const buf = await file.slice(0, HEAD_BYTES).arrayBuffer()
  return new Uint8Array(buf)
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [items, setItems] = useState<FormatCheckItem[]>([])
  const [detecting, setDetecting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const labels = useMemo<ReportLabels>(
    () => ({
      title: t('imageFormat.title'),
      fileLabel: t('imageFormat.fileLabel'),
      declaredLabel: t('imageFormat.declaredLabel'),
      detectedLabel: t('imageFormat.detectedLabel'),
      conclusionLabel: t('imageFormat.conclusionLabel'),
      summaryPrefix: t('imageFormat.summaryPrefix'),
      summaryUnit: t('imageFormat.summaryUnit'),
      matchText: t('imageFormat.matchText'),
      mismatchText: t('imageFormat.mismatchText'),
      unrecognizedText: t('imageFormat.unrecognizedText'),
      noextText: t('imageFormat.noextText'),
      unknownFormat: t('imageFormat.formatUnknown'),
      noExtension: t('imageFormat.noExtension'),
    }),
    [t],
  )

  const detect = useCallback(
    async (fileList: File[]) => {
      setError(null)
      setCopied(false)
      if (fileList.length === 0) {
        setError(t('imageFormat.noFiles'))
        return
      }
      try {
        assertFileCountOk(fileList.length)
      } catch (err) {
        setError(errorMessage(err))
        return
      }
      setDetecting(true)
      setItems([])
      setProgress({ done: 0, total: fileList.length })
      try {
        const out: FormatCheckItem[] = []
        for (const file of fileList) {
          assertFileSizeOk(file.name, file.size)
          const head = await readFileHead(file)
          out.push(checkConsistency(file.name, detectFormatByMagic(head), file.type))
          setProgress({ done: out.length, total: fileList.length })
        }
        setItems(out)
      } catch (err) {
        setError(errorMessage(err))
        setItems([])
      } finally {
        setDetecting(false)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const arr = Array.from(fileList)
      setFiles(arr)
      // 选择后自动检测
      void detect(arr)
    },
    [detect],
  )

  const reportText = useMemo(
    () => (items.length > 0 ? buildReportText(items, labels) : ''),
    [items, labels],
  )

  const handleCopy = useCallback(async () => {
    setError(null)
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
    } catch {
      // 剪贴板不可用（如非安全上下文）时提示手动复制
      setError(t('imageFormat.copyFailed'))
    }
  }, [reportText, t])

  const handleDownload = useCallback(() => {
    downloadBlob(new Blob([reportText], { type: 'text/plain;charset=utf-8' }), REPORT_FILE_NAME)
  }, [reportText])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    fileRef.current = null
    setFiles([])
    setItems([])
    setError(null)
    setCopied(false)
    setProgress({ done: 0, total: 0 })
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageFormat.note')}</p>

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
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {files.length > 0 ? (
            <>
              {files.length}
              {t('imageFormat.summaryUnit')}
            </>
          ) : (
            t('imageFormat.dropHint')
          )}
        </p>
      </label>

      {/* 操作 */}
      <div className="flex flex-wrap gap-3">
        <button
          data-testid="detect"
          type="button"
          onClick={() => void detect(files)}
          disabled={detecting}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('imageFormat.detect')}
        </button>
        {items.length > 0 && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          >
            {t('imageFormat.reset')}
          </button>
        )}
      </div>

      {detecting && (
        <p data-testid="progress" className="text-sm text-slate-600 dark:text-slate-400">
          {t('imageFormat.detecting')} {progress.done}/{progress.total}
        </p>
      )}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 检测结果 */}
      {items.length > 0 && (
        <div data-testid="result-list" className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {labels.summaryPrefix}
            {items.length}
            {labels.summaryUnit}
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((item, i) => (
              <li
                key={`${item.fileName}-${i}`}
                data-testid={`row-${i}`}
                className="rounded border border-slate-200 p-3 text-sm dark:border-slate-700"
              >
                <p className="font-medium break-all">
                  {labels.fileLabel}：{item.fileName}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {labels.declaredLabel}：
                  {item.declaredExt === ''
                    ? labels.noExtension
                    : item.declaredMime === ''
                      ? item.declaredExt
                      : `${item.declaredExt}（${item.declaredMime}）`}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {labels.detectedLabel}：
                  {item.detected === 'unknown' ? labels.unknownFormat : formatLabel(item.detected)}
                </p>
                <p
                  className={
                    item.consistency === 'match'
                      ? 'text-green-600 dark:text-green-400'
                      : item.consistency === 'mismatch'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                  }
                >
                  {labels.conclusionLabel}：{conclusionText(item.consistency, labels)}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              data-testid="copy-report"
              type="button"
              onClick={() => void handleCopy()}
              className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              {copied ? t('imageFormat.copied') : t('imageFormat.copyReport')}
            </button>
            <button
              data-testid="download-report"
              type="button"
              onClick={handleDownload}
              className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              {t('imageFormat.downloadReport')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
