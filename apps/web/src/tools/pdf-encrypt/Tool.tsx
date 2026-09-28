import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import { errorMessage, getQpdfModule, runQpdf } from '../../lib/qpdf'
import {
  assertFileSizeOk,
  buildEncryptArgs,
  buildOutputFileName,
  isEncryptedPdf,
  isPdfFile,
  resolveOwnerPassword,
  validatePassword,
} from './utils'
import type { PdfEncryptOptions } from './schema'

interface Result {
  url: string
  blob: Blob
  fileName: string
  size: number
  keyLength: string
}

type EngineState = 'loading' | 'ready' | 'failed'

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null)
  const [options, setOptions] = useState<PdfEncryptOptions>({
    userPassword: '',
    ownerPassword: '',
    keyLength: '256',
    allowPrint: true,
    allowExtract: true,
    allowModify: true,
    allowAnnotate: true,
  })
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [engine, setEngine] = useState<EngineState>('loading')
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  // 预热 WASM 加密引擎：qpdf-wasm 首次初始化稍慢，挂载时提前加载
  useEffect(() => {
    let cancelled = false
    const settle = (state: EngineState) => {
      if (!cancelled) setEngine(state)
    }
    getQpdfModule().then(
      () => settle('ready'),
      () => settle('failed'),
    )
    return () => {
      cancelled = true
    }
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      setError(null)
      setResult(null)
      try {
        assertFileSizeOk(file.size)
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(bytes)) throw new Error(t('pdfEncrypt.error.unsupported'))
        let encrypted: boolean
        try {
          encrypted = await isEncryptedPdf(bytes)
        } catch {
          throw new Error(t('pdfEncrypt.error.invalid'))
        }
        if (encrypted) throw new Error(t('pdfEncrypt.error.encrypted'))
        setFileBytes(bytes)
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setFileBytes(null)
        setFileName('')
      }
    },
    [t],
  )

  const handleOptionChange = useCallback((patch: Partial<PdfEncryptOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleClearPasswords = useCallback(() => {
    setOptions((prev) => ({ ...prev, userPassword: '', ownerPassword: '' }))
  }, [])

  const handleEncrypt = useCallback(async () => {
    if (!fileBytes) return
    if (engine === 'failed') {
      setError(t('pdfEncrypt.error.engine'))
      return
    }
    setProcessing(true)
    setError(null)
    try {
      // 密码只存 useState 内存：校验不回显原文，错误消息不含密码
      validatePassword(options.userPassword)
      const userPassword = options.userPassword
      const ownerPassword = resolveOwnerPassword(userPassword, options.ownerPassword)
      validatePassword(ownerPassword)
      const perms = {
        print: options.allowPrint,
        extract: options.allowExtract,
        modify: options.allowModify,
        annotate: options.allowAnnotate,
      }
      const keyLength = options.keyLength
      const outName = buildOutputFileName(fileName)
      // 直接调 lib/qpdf 的 runQpdf，不再包一层；qpdf 非零退出码即抛错
      const encryptedBytes = await runQpdf(fileBytes, (inP, outP) =>
        buildEncryptArgs(userPassword, ownerPassword, keyLength, perms, inP, outP),
      )
      // 拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart（TypedArray 不写显式泛型）
      const copy = new Uint8Array(encryptedBytes)
      const blob = new Blob([copy.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setResult({ url, blob, fileName: outName, size: encryptedBytes.length, keyLength })
      // 处理完自动清空密码，不留内存残留
      setOptions((prev) => ({ ...prev, userPassword: '', ownerPassword: '' }))
    } catch (err) {
      setError(errorMessage(err))
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }, [fileBytes, engine, options, fileName, t])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setFileBytes(null)
    setFileName('')
    setError(null)
    setOptions((prev) => ({ ...prev, userPassword: '', ownerPassword: '' }))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfEncrypt.note')}</p>

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
          void handleFiles(e.dataTransfer.files)
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
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfEncrypt.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfEncrypt.userPassword')}
          <input
            data-testid="opt-userpw"
            type="password"
            autoComplete="new-password"
            value={options.userPassword}
            onChange={(e) => handleOptionChange({ userPassword: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfEncrypt.ownerPassword')}
          <input
            data-testid="opt-ownerpw"
            type="password"
            autoComplete="new-password"
            value={options.ownerPassword}
            onChange={(e) => handleOptionChange({ ownerPassword: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="text-xs text-slate-500">{t('pdfEncrypt.ownerPasswordHint')}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfEncrypt.keyLength')}
          <select
            data-testid="opt-keylength"
            value={options.keyLength}
            onChange={(e) =>
              handleOptionChange({ keyLength: e.target.value as PdfEncryptOptions['keyLength'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="256">{t('pdfEncrypt.key256')}</option>
            <option value="128">{t('pdfEncrypt.key128')}</option>
          </select>
        </label>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="mb-1 text-sm text-slate-600 dark:text-slate-400">
            {t('pdfEncrypt.permissions')}
          </legend>
          <label className="flex items-center gap-1">
            <input
              data-testid="perm-print"
              type="checkbox"
              checked={options.allowPrint}
              onChange={(e) => handleOptionChange({ allowPrint: e.target.checked })}
            />
            {t('pdfEncrypt.perm.print')}
          </label>
          <label className="flex items-center gap-1">
            <input
              data-testid="perm-extract"
              type="checkbox"
              checked={options.allowExtract}
              onChange={(e) => handleOptionChange({ allowExtract: e.target.checked })}
            />
            {t('pdfEncrypt.perm.extract')}
          </label>
          <label className="flex items-center gap-1">
            <input
              data-testid="perm-modify"
              type="checkbox"
              checked={options.allowModify}
              onChange={(e) => handleOptionChange({ allowModify: e.target.checked })}
            />
            {t('pdfEncrypt.perm.modify')}
          </label>
          <label className="flex items-center gap-1">
            <input
              data-testid="perm-annotate"
              type="checkbox"
              checked={options.allowAnnotate}
              onChange={(e) => handleOptionChange({ allowAnnotate: e.target.checked })}
            />
            {t('pdfEncrypt.perm.annotate')}
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button
            data-testid="encrypt"
            type="button"
            onClick={() => void handleEncrypt()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfEncrypt.encrypt')}
          </button>
          <button
            data-testid="clear-passwords"
            type="button"
            onClick={handleClearPasswords}
            className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          >
            {t('pdfEncrypt.clearPasswords')}
          </button>
          {(result ?? fileName) && (
            <button
              data-testid="reset"
              type="button"
              onClick={handleReset}
              className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
            >
              {t('pdfEncrypt.reset')}
            </button>
          )}
        </div>
      </div>

      {processing && (
        <p data-testid="processing">
          {engine === 'loading' ? t('pdfEncrypt.engineLoading') : t('pdfEncrypt.processing')}
        </p>
      )}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：下载按钮只在 result 存在时渲染 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfEncrypt.resultInfo')}：{result.fileName}（{formatBytes(result.size)}，
            {result.keyLength}-bit）
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfEncrypt.download')}
          </button>
        </div>
      )}
    </div>
  )
}
