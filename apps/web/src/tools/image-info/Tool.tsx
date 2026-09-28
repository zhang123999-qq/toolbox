import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { formatBytes, loadImageFromBlob, readFileAsDataURL } from '../../lib/image'
import {
  HEADER_BYTES,
  aspectRatioText,
  assertFileSizeOk,
  detectImageFormat,
  errorMessage,
  formatLabel,
  guessDeclaredType,
  isFormatMismatch,
  megapixelsText,
} from './utils'
import type { DetectedFormat } from './utils'

interface ImageInfo {
  fileName: string
  fileSize: number
  declared: string
  detected: DetectedFormat
  width: number
  height: number
  colorSpace: 'srgb' | 'display-p3' | null
}

/**
 * 读取当前 Canvas 的色彩空间。任何异常（无 2D 上下文、API 不可用等）
 * 都吞掉返回 null，调用方显示"未知"，绝不抛错。
 */
function readColorSpace(): 'srgb' | 'display-p3' | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    return ctx.getImageData(0, 0, 1, 1).colorSpace
  } catch {
    return null
  }
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [info, setInfo] = useState<ImageInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        // 只读文件前 512 字节做魔数识别，不加载整个文件
        const head = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())
        const detected = detectImageFormat(head)
        if (detected === 'unknown') throw new Error(t('imageInfo.error.unsupported'))
        const declared = guessDeclaredType(file.name, file.type)
        const img = await loadImageFromBlob(file)
        const colorSpace = readColorSpace()
        const preview = await readFileAsDataURL(file)
        setInfo({
          fileName: file.name,
          fileSize: file.size,
          declared,
          detected,
          width: img.width,
          height: img.height,
          colorSpace,
        })
        setPreviewUrl(preview)
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setInfo(null)
      } finally {
        setProcessing(false)
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
    setInfo(null)
    setPreviewUrl(null)
    setFileName('')
    setError(null)
  }, [])

  const mismatch = info ? isFormatMismatch(info.declared, info.detected) : false

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageInfo.note')}</p>

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
          {fileName ? fileName : t('imageInfo.dropHint')}
        </p>
      </label>

      {info && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('imageInfo.reset')}
        </button>
      )}

      {processing && <p data-testid="processing">{t('imageInfo.processing')}</p>}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 元信息表 */}
      {info && (
        <div data-testid="info-table" className="flex flex-col gap-3">
          {previewUrl && (
            <img
              data-testid="preview"
              src={previewUrl}
              alt=""
              className="max-h-64 w-fit rounded border object-contain"
            />
          )}
          {mismatch && (
            <p
              data-testid="format-warning"
              role="alert"
              className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            >
              {t('imageInfo.warning.mismatch')}
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">{t('imageInfo.field.name')}</dt>
            <dd data-testid="info-name" className="break-all">
              {info.fileName}
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">{t('imageInfo.field.size')}</dt>
            <dd data-testid="info-size">{formatBytes(info.fileSize)}</dd>
            <dt className="text-slate-500 dark:text-slate-400">{t('imageInfo.field.declared')}</dt>
            <dd data-testid="info-declared">
              {info.declared === '' ? t('imageInfo.unknown') : info.declared.toUpperCase()}
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">{t('imageInfo.field.detected')}</dt>
            <dd data-testid="info-detected">{formatLabel(info.detected)}</dd>
            <dt className="text-slate-500 dark:text-slate-400">
              {t('imageInfo.field.dimensions')}
            </dt>
            <dd data-testid="info-dimensions">
              {info.width}×{info.height}
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">{t('imageInfo.field.ratio')}</dt>
            <dd data-testid="info-ratio">{aspectRatioText(info.width, info.height)}</dd>
            <dt className="text-slate-500 dark:text-slate-400">
              {t('imageInfo.field.megapixels')}
            </dt>
            <dd data-testid="info-megapixels">{megapixelsText(info.width, info.height)}</dd>
            <dt className="text-slate-500 dark:text-slate-400">
              {t('imageInfo.field.colorspace')}
            </dt>
            <dd data-testid="info-colorspace">{info.colorSpace ?? t('imageInfo.unknown')}</dd>
          </dl>
        </div>
      )}
    </div>
  )
}
