import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { downloadBlob, isSupportedImageFile, readFileAsDataURL } from '../../lib/image'
import { decodeInputSchema } from './schema'
import type { ImageBase64Options } from './schema'
import {
  assertFileSizeOk,
  base64ApproxBytes,
  buildOutputFileName,
  DEFAULT_DECODE_MIME,
  errorMessage,
  isValidBase64,
  normalizeBase64Input,
  parseDataUrl,
} from './utils'

/**
 * imageBase64.* 文案 key 尚未并入全局 messages（由父流程统一合并），
 * 此处用动态拼接 + 断言绕开字面量类型检查（仓库先例见 zodiac-match/utils.ts）。
 */
function msg(suffix: string): MessageKey {
  return ('imageBase64.' + suffix) as MessageKey
}

/** 编码结果：文本 + 原图预览 + 文件名（单对象，避免条件渲染死分支） */
interface EncodeResult {
  text: string
  preview: string
  fileName: string
}

/** 解码结果：url 可直接作为 <img> src 与下载链接 href，无需 atob 解码 */
interface DecodeResult {
  url: string
  fileName: string
  chars: number
  bytes: number
}

/** 编码模式下载的 txt 文件名 */
const TXT_FILE_NAME = 'image-base64.txt'

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [options, setOptions] = useState<ImageBase64Options>({ mode: 'encode', dataUrl: 'full' })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [encodeResult, setEncodeResult] = useState<EncodeResult | null>(null)
  const [decodeInput, setDecodeInput] = useState('')
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null)

  const processFile = useCallback(
    async (file: File, dataUrlOpt: ImageBase64Options['dataUrl']) => {
      setProcessing(true)
      setError(null)
      setCopied(false)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t(msg('error.unsupported')))
        const full = await readFileAsDataURL(file)
        const text = dataUrlOpt === 'raw' ? parseDataUrl(full).base64 : full
        setEncodeResult({ text, preview: full, fileName: file.name })
      } catch (err) {
        setError(errorMessage(err))
        setEncodeResult(null)
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
      void processFile(file, options.dataUrl)
    },
    [options.dataUrl, processFile],
  )

  const handleModeChange = useCallback((mode: ImageBase64Options['mode']) => {
    setOptions((prev) => ({ ...prev, mode }))
    setError(null)
  }, [])

  const handleDataUrlChange = useCallback(
    (dataUrl: ImageBase64Options['dataUrl']) => {
      const next = { ...options, dataUrl }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], dataUrl)
    },
    [options, processFile],
  )

  const handleResetEncode = useCallback(() => {
    setInputKey((k) => k + 1)
    setEncodeResult(null)
    setError(null)
    setCopied(false)
  }, [])

  const handleCopy = useCallback(
    async (text: string) => {
      setError(null)
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      } catch {
        // 剪贴板不可用（如非安全上下文）时提示手动复制
        setError(t(msg('error.copyFailed')))
      }
    },
    [t],
  )

  const handleDownloadTxt = useCallback((text: string) => {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), TXT_FILE_NAME)
  }, [])

  const handleConvert = useCallback(() => {
    setError(null)
    try {
      // 超长输入由 schema 限长：此处走「提示」分支（无死分支，见单测「超长输入提示错误」）
      const parsed = decodeInputSchema.safeParse({ base64Text: decodeInput })
      if (!parsed.success) throw new Error(t(msg('error.tooLong')))
      const normalized = normalizeBase64Input(parsed.data.base64Text)
      if (normalized === '') throw new Error(t(msg('error.emptyInput')))
      const { mime, base64 } = parseDataUrl(normalized)
      if (!isValidBase64(base64)) throw new Error(t(msg('error.invalidBase64')))
      // 无 DataURL 前缀时默认按 PNG 处理
      const finalMime = mime ?? DEFAULT_DECODE_MIME
      setDecodeResult({
        url: `data:${finalMime};base64,${base64}`,
        fileName: buildOutputFileName(finalMime),
        chars: base64.length,
        bytes: base64ApproxBytes(base64.length),
      })
    } catch (err) {
      setError(errorMessage(err))
      setDecodeResult(null)
    }
  }, [decodeInput, t])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t(msg('note'))}</p>

      {/* 模式切换 */}
      <div className="flex gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            data-testid="mode-encode"
            checked={options.mode === 'encode'}
            onChange={() => handleModeChange('encode')}
          />
          {t(msg('mode.encode'))}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            data-testid="mode-decode"
            checked={options.mode === 'decode'}
            onChange={() => handleModeChange('decode')}
          />
          {t(msg('mode.decode'))}
        </label>
      </div>

      {options.mode === 'encode' ? (
        <>
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
              {encodeResult ? encodeResult.fileName : t(msg('encode.dropHint'))}
            </p>
          </label>

          {/* 输出形式选项 */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {t(msg('encode.outputLabel'))}
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                data-testid="opt-dataurl-full"
                checked={options.dataUrl === 'full'}
                onChange={() => handleDataUrlChange('full')}
              />
              {t(msg('encode.full'))}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                data-testid="opt-dataurl-raw"
                checked={options.dataUrl === 'raw'}
                onChange={() => handleDataUrlChange('raw')}
              />
              {t(msg('encode.raw'))}
            </label>
            {encodeResult && (
              <button
                data-testid="reset"
                type="button"
                onClick={handleResetEncode}
                className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
              >
                {t(msg('reset'))}
              </button>
            )}
          </div>

          {/* 编码结果：有结果才渲染 */}
          {encodeResult && (
            <div className="flex flex-col gap-3">
              <img
                data-testid="preview"
                src={encodeResult.preview}
                alt=""
                className="max-h-64 w-fit rounded border object-contain"
              />
              <p data-testid="encode-stats" className="text-sm text-slate-600 dark:text-slate-400">
                {t(msg('stats'), {
                  chars: String(encodeResult.text.length),
                  bytes: String(base64ApproxBytes(encodeResult.text.length)),
                })}
              </p>
              <label className="flex flex-col gap-1 text-sm">
                {t(msg('encode.resultLabel'))}
                <textarea
                  data-testid="b64-output"
                  readOnly
                  rows={8}
                  value={encodeResult.text}
                  className="break-all rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  data-testid="btn-copy"
                  type="button"
                  // encodeResult 非空才渲染此按钮，TS 已收窄，无需空守卫
                  onClick={() => handleCopy(encodeResult.text)}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  {t(msg('copy'))}
                </button>
                <button
                  data-testid="btn-download-txt"
                  type="button"
                  onClick={() => handleDownloadTxt(encodeResult.text)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
                >
                  {t(msg('downloadTxt'))}
                </button>
                {copied && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {t(msg('copied'))}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            {t(msg('decode.inputLabel'))}
            <textarea
              data-testid="b64-input"
              rows={8}
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder={t(msg('decode.placeholder'))}
              className="break-all rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div>
            <button
              data-testid="btn-convert"
              type="button"
              onClick={handleConvert}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t(msg('decode.convert'))}
            </button>
          </div>

          {/* 解码结果：有结果才渲染 */}
          {decodeResult && (
            <div className="flex flex-col gap-3">
              <img
                data-testid="preview-img"
                src={decodeResult.url}
                alt=""
                className="max-h-64 w-fit rounded border object-contain"
              />
              <p data-testid="decode-stats" className="text-sm text-slate-600 dark:text-slate-400">
                {t(msg('stats'), {
                  chars: String(decodeResult.chars),
                  bytes: String(decodeResult.bytes),
                })}
              </p>
              <a
                data-testid="btn-download-img"
                href={decodeResult.url}
                download={decodeResult.fileName}
                className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                {t(msg('decode.download'))}
              </a>
            </div>
          )}
        </>
      )}

      {processing && <p data-testid="processing">{t(msg('processing'))}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
