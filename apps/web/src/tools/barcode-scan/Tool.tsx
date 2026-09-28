import { useCallback, useRef, useState } from 'react'
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  DecodeHintType,
  NotFoundException,
} from '@zxing/library'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  SUPPORTED_FORMATS,
  assertFileSizeOk,
  computeScanDimensions,
  errorMessage,
  formatBarcodeFormat,
} from './utils'

interface ScanResult {
  text: string
  format: string
  fileName: string
  width: number
  height: number
  preview: string
}

/** 构造识别器：只尝试 SUPPORTED_FORMATS 中的一维码制 */
function createReader(): BrowserMultiFormatReader {
  const formats = SUPPORTED_FORMATS.map((f) => BarcodeFormat[f])
  const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, formats]])
  return new BrowserMultiFormatReader(hints)
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
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
      setCopied(false)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('barcodeScan.error.unsupported'))
        const img = await loadImageFromBlob(file)
        const { width, height } = computeScanDimensions(img.width, img.height)
        // 大图先等比缩放到识别尺寸再解码；小图直接用原图。
        // 中间图用 PNG 无损转码，避免压缩伪影影响识别率。
        let source: HTMLImageElement = img
        if (width !== img.width || height !== img.height) {
          const scaledBlob = await canvasToBlob(
            drawScaled(img, img.width, img.height, width, height),
            'image/png',
          )
          source = await loadImageFromBlob(scaledBlob)
        }
        const decoded = await createReader().decodeFromImageElement(source)
        const formatKey = BarcodeFormat[decoded.getBarcodeFormat()]
        const preview = await readFileAsDataURL(file)
        setResult({
          text: decoded.getText(),
          format: formatBarcodeFormat(typeof formatKey === 'string' ? formatKey : 'UNKNOWN'),
          fileName: file.name,
          width,
          height,
          preview,
        })
      } catch (err) {
        // 未识别到条形码是正常业务分支，给友好提示而非技术错误
        if (err instanceof NotFoundException) {
          setError(t('barcodeScan.error.notFound'))
        } else {
          setError(errorMessage(err))
        }
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

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      } catch {
        setError(t('barcodeScan.error.copyFailed'))
      }
    },
    [t],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setCopied(false)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('barcodeScan.note')}</p>

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
          {result ? result.fileName : t('barcodeScan.dropHint')}
        </p>
      </label>

      {result && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('barcodeScan.reset')}
        </button>
      )}

      {processing && <p data-testid="processing">{t('barcodeScan.processing')}</p>}
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
            src={result.preview}
            alt=""
            className="max-h-64 w-fit rounded border object-contain"
          />
          <p data-testid="format" className="text-sm text-slate-600 dark:text-slate-400">
            {t('barcodeScan.formatLabel')}：{result.format}
          </p>
          <p
            data-testid="result-text"
            className="break-all rounded bg-slate-100 p-3 font-mono text-sm dark:bg-slate-800"
          >
            {result.text}
          </p>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('barcodeScan.stats', { w: String(result.width), h: String(result.height) })}
          </p>
          <div className="flex items-center gap-3">
            <button
              data-testid="copy"
              type="button"
              // result 非空才渲染此按钮，TS 已收窄，无需空守卫
              onClick={() => void handleCopy(result.text)}
              className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t('barcodeScan.copy')}
            </button>
            {copied && (
              <span data-testid="copied" className="text-sm text-green-600 dark:text-green-400">
                {t('barcodeScan.copied')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
