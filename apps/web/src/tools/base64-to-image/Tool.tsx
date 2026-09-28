import { useCallback, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  loadImageFromBlob,
} from '../../lib/image'
import {
  base64ToBytes,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseBase64Input,
  parseQuality,
  sniffMimeFromBytes,
} from './utils'
import type { Base64ToImageOptions } from './schema'

/**
 * base64ToImage.* 文案 key 尚未并入全局 messages（由父流程统一合并），
 * 此处用动态拼接 + 断言绕开字面量类型检查（仓库先例见 image-base64/Tool.tsx）。
 */

/** 解码结果：解码后图片的尺寸/体积、下载用 Blob 与预览 URL */
interface DecodeResult {
  url: string
  fileName: string
  width: number
  height: number
  bytes: number
  blob: Blob
}

const FORMAT_OPTIONS = ['png', 'jpeg'] as const

export default function Tool() {
  const t = useTranslate()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<Base64ToImageOptions>({ format: 'png', quality: '80' })

  const handleDecode = useCallback(async () => {
    setProcessing(true)
    setError(null)
    try {
      const parsed = parseBase64Input(input)
      const bytes = base64ToBytes(parsed.data)
      // 纯 base64 无声明 MIME 时按文件头魔数推断，兜底 image/png
      const mime = parsed.mime ?? sniffMimeFromBytes(bytes)
      const quality = parseQuality(options.quality)
      // 用图片加载验证解码内容确为有效图片，失败则报错
      const img = await loadImageFromBlob(new Blob([bytes], { type: mime }))
      const canvas = createCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D 上下文不可用')
      if (options.format === 'jpeg') {
        // JPEG 不支持透明通道：先铺白底，避免透明区域导出变黑
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0)
      const outMime = formatToMime(options.format)
      const blob = await canvasToBlob(canvas, outMime, effectiveQuality(options.format, quality))
      const url = URL.createObjectURL(blob)
      setResult({
        url,
        fileName: buildOutputFileName(options.format),
        width: img.width,
        height: img.height,
        bytes: blob.size,
        blob,
      })
    } catch (err) {
      setError(errorMessage(err))
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }, [input, options])

  const handlePaste = useCallback(async () => {
    setError(null)
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
    } catch {
      // 剪贴板不可用（如非安全上下文）时降级为手动粘贴提示
      setError(t('base64ToImage.pasteFailed'))
    }
  }, [t])

  const handleReset = useCallback(() => {
    setInput('')
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('base64ToImage.note')}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('base64ToImage.inputHint')}</p>

      <label className="flex flex-col gap-2 text-sm">
        {t('base64ToImage.inputLabel')}
        <textarea
          data-testid="base64-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('base64ToImage.placeholder')}
          rows={8}
          spellCheck={false}
          className="rounded border border-slate-300 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('base64ToImage.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                format: e.target.value as Base64ToImageOptions['format'],
              }))
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('base64ToImage.quality')}
          <input
            data-testid="opt-quality"
            type="number"
            min={1}
            max={100}
            value={options.quality}
            onChange={(e) => setOptions((prev) => ({ ...prev, quality: e.target.value }))}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <button
          data-testid="paste"
          type="button"
          onClick={() => void handlePaste()}
          className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('base64ToImage.paste')}
        </button>
        <button
          data-testid="decode"
          type="button"
          onClick={() => void handleDecode()}
          disabled={processing}
          className="rounded bg-blue-600 px-4 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {processing ? t('base64ToImage.decoding') : t('base64ToImage.decode')}
        </button>
        {(input !== '' || result) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('base64ToImage.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('base64ToImage.decoding')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <img
            data-testid="preview"
            src={result.url}
            alt=""
            className="max-h-80 rounded border object-contain"
          />
          {/* 动态文案用 JSX 插值，不走 t(key, params) */}
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {result.width} × {result.height} px · {formatBytes(result.bytes)}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('base64ToImage.download')}
          </button>
        </div>
      )}
    </div>
  )
}
