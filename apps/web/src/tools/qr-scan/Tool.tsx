import { useCallback, useRef, useState } from 'react'
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from '@zxing/library'
import { useTranslate } from '../../i18n'
import { canvasToBlob, drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'
import { assertFileSizeOk, computeScanDimensions, errorMessage, formatBarcodeFormat } from './utils'

interface ScanResult {
  text: string
  format: string
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File) => {
      setProcessing(true)
      setError(null)
      setResult(null)
      setCopied(false)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('qrScan.error.unsupported'))
        const img = await loadImageFromBlob(file)
        // 大图先等比缩放至最大边 2000 再识别，提速
        const { width, height } = computeScanDimensions(img.width, img.height)
        let source: string | HTMLImageElement = img
        let tempUrl: string | null = null
        if (width !== img.width || height !== img.height) {
          const canvas = drawScaled(img, img.width, img.height, width, height)
          const blob = await canvasToBlob(canvas, 'image/png')
          tempUrl = URL.createObjectURL(blob)
          source = tempUrl
        }
        // hints 构造涉及 zxing 类，按约定放在组件里，不下沉到 utils
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]]])
        const reader = new BrowserMultiFormatReader(hints)
        let decoded: ScanResult
        try {
          const zxingResult = await reader.decodeFromImageElement(source)
          decoded = {
            text: zxingResult.getText(),
            format: formatBarcodeFormat(String(BarcodeFormat[zxingResult.getBarcodeFormat()])),
          }
        } catch {
          // 能走到这里说明图片本身可解码，只是其中没有二维码
          // （zxing 未找到条码时抛 NotFoundException；图片解码失败已在
          // loadImageFromBlob 阶段抛出，不走这个分支）
          throw new Error(t('qrScan.error.notFound'))
        } finally {
          if (tempUrl) URL.revokeObjectURL(tempUrl)
        }
        setResult(decoded)
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setResult(null)
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
    setResult(null)
    setFileName('')
    setError(null)
    setCopied(false)
  }, [])

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      } catch {
        // 非安全上下文 / 无权限时降级为提示，用户可手动选择文本复制
        setError(t('qrScan.error.copyFailed'))
      }
    },
    [t],
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('qrScan.note')}</p>

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
          {fileName ? fileName : t('qrScan.dropHint')}
        </p>
      </label>

      {(result || error) && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('qrScan.reset')}
        </button>
      )}

      {processing && <p data-testid="processing">{t('qrScan.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：解码文本保留换行展示 + 码制 + 一键复制 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <div>
            <p data-testid="result-format" className="mb-1 text-sm text-slate-500">
              {t('qrScan.formatLabel')}
              {result.format}
            </p>
            <p data-testid="result-content-label" className="mb-1 text-sm text-slate-500">
              {t('qrScan.contentLabel')}
            </p>
            <pre
              data-testid="result-text"
              className="whitespace-pre-wrap break-all rounded border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {result.text}
            </pre>
          </div>
          <button
            data-testid="copy"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => handleCopy(result.text)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {copied ? t('qrScan.copied') : t('qrScan.copy')}
          </button>
        </div>
      )}
    </div>
  )
}
