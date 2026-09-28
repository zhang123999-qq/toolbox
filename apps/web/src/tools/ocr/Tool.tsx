import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'
import {
  assertFileSizeOk,
  computeOcrDimensions,
  errorMessage,
  parseLangs,
  progressText,
  terminateWorker,
} from './utils'
import type { OcrWorker } from './utils'
import type { OcrOptions } from './schema'

/** 识别结果：文本 + 预览图 URL（合并为一个 state，避免渲染条件分支） */
interface OcrResult {
  text: string
  preview: string
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<OcrWorker | null>(null)
  const previewRef = useRef<string | null>(null)
  const runRef = useRef(0)
  const [inputKey, setInputKey] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [result, setResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [options, setOptions] = useState<OcrOptions>({ chiSim: '1', eng: '1' })

  // 卸载时终止残留 worker，避免后台继续占用线程
  useEffect(() => {
    return () => {
      runRef.current += 1
      const w = workerRef.current
      workerRef.current = null
      void terminateWorker(w)
    }
  }, [])

  const runOcr = useCallback(
    async (file: File, opts: OcrOptions) => {
      const myRun = runRef.current + 1
      runRef.current = myRun
      const alive = () => runRef.current === myRun

      setProcessing(true)
      setError(null)
      setResult(null)
      setCopied(false)
      setFileName(file.name)
      setProgress(0)
      setProgressLabel(t('ocr.processing'))

      try {
        // 同一时间只允许一个识别任务：新任务先终止旧 worker
        const old = workerRef.current
        workerRef.current = null
        await terminateWorker(old)

        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('ocr.error.unsupported'))
        const langs = parseLangs(opts.chiSim, opts.eng)

        const img = await loadImageFromBlob(file)
        if (!alive()) return
        // 大图先等比缩放再识别，提速且省内存
        const { width, height } = computeOcrDimensions(img.width, img.height)
        const canvas = drawScaled(img, img.width, img.height, width, height)
        if (previewRef.current) URL.revokeObjectURL(previewRef.current)
        const preview = URL.createObjectURL(file)
        previewRef.current = preview

        // tesseract.js 按需懒加载：首屏不打包识别引擎
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker(langs, undefined, {
          logger: (m) => {
            if (!alive()) return
            setProgress(m.progress)
            setProgressLabel(progressText(m.status, m.progress, t))
          },
        })
        workerRef.current = worker
        if (!alive()) {
          // 等待引擎期间被取消或被新任务取代：立即释放刚建好的 worker
          workerRef.current = null
          await terminateWorker(worker)
          return
        }

        const { data } = await worker.recognize(canvas)
        if (!alive()) return
        setResult({ text: data.text, preview })
      } catch (err) {
        if (!alive()) return
        setError(errorMessage(err))
      } finally {
        // 存活才做收尾：过期任务（被取消/被新任务取代）不碰任何状态
        if (alive()) {
          setProcessing(false)
          // 任务结束即释放 worker，下次识别重建（语言包有缓存，二次加载很快）
          const w = workerRef.current
          workerRef.current = null
          await terminateWorker(w)
        }
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      void runOcr(file, options)
    },
    [options, runOcr],
  )

  const handleLangChange = useCallback((key: 'chiSim' | 'eng', checked: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: checked ? '1' : '' }))
  }, [])

  const handleCancel = useCallback(async () => {
    runRef.current += 1
    const w = workerRef.current
    workerRef.current = null
    await terminateWorker(w)
    setProcessing(false)
    setProgressLabel('')
    setError(t('ocr.cancelled'))
  }, [t])

  const handleCopy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
      } catch {
        // clipboard 不可用或被拒绝时降级为错误提示，用户可手动选择文本复制
        setError(t('ocr.error.copyFailed'))
      }
    },
    [t],
  )

  const handleReset = useCallback(async () => {
    runRef.current += 1
    const w = workerRef.current
    workerRef.current = null
    await terminateWorker(w)
    setInputKey((k) => k + 1)
    setResult(null)
    setFileName('')
    setError(null)
    setProcessing(false)
    setProgress(0)
    setProgressLabel('')
    setCopied(false)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* 隐私告知：tesseract.js 从 CDN 下载引擎与语言包，图片本身不上传 —— 显著位置 */}
      <p
        data-testid="cdn-notice"
        className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
      >
        {t('ocr.cdnNotice')}
      </p>

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
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('ocr.dropHint')}
        </p>
      </label>

      {/* 语言选项 */}
      <fieldset className="flex flex-wrap items-center gap-4">
        <legend className="text-sm text-slate-600 dark:text-slate-400">{t('ocr.languages')}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            data-testid="opt-chiSim"
            type="checkbox"
            checked={options.chiSim === '1'}
            onChange={(e) => handleLangChange('chiSim', e.target.checked)}
          />
          {t('ocr.lang.chiSim')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            data-testid="opt-eng"
            type="checkbox"
            checked={options.eng === '1'}
            onChange={(e) => handleLangChange('eng', e.target.checked)}
          />
          {t('ocr.lang.eng')}
        </label>
      </fieldset>

      {/* 进度：百分比 + 可取消 */}
      {processing && (
        <div data-testid="progress" className="flex flex-col gap-2">
          <div className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
            <div
              data-testid="progress-bar"
              className="h-full rounded bg-blue-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p data-testid="progress-label" className="text-sm text-slate-600 dark:text-slate-400">
              {progressLabel}
            </p>
            <button
              data-testid="cancel"
              type="button"
              onClick={() => void handleCancel()}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('ocr.cancel')}
            </button>
          </div>
        </div>
      )}

      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：预览 + 只读文本 + 复制 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <img
              data-testid="preview"
              src={result.preview}
              alt=""
              className="max-h-64 rounded border object-contain"
            />
          </figure>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            {t('ocr.result')}
            <textarea
              data-testid="result-text"
              readOnly
              rows={8}
              value={result.text}
              className="rounded border border-slate-300 p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              data-testid="copy"
              type="button"
              onClick={() => void handleCopy(result.text)}
              className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t('ocr.copy')}
            </button>
            {copied && (
              <span data-testid="copied" className="text-sm text-green-600 dark:text-green-400">
                {t('ocr.copied')}
              </span>
            )}
            <button
              data-testid="reset"
              type="button"
              onClick={() => void handleReset()}
              className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
            >
              {t('ocr.reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
