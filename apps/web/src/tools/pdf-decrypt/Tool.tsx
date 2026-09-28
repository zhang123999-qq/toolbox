import { useCallback, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { runQpdf } from '../../lib/qpdf'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  DECRYPT_FAILURE_KEYS,
  assertFileSizeOk,
  buildDecryptArgs,
  buildOutputFileName,
  classifyDecryptError,
  isPdfFile,
  probePdfEncryption,
  validatePassword,
} from './utils'

interface PendingFile {
  name: string
  bytes: Uint8Array
}

interface DecryptResult {
  url: string
  blob: Blob
  fileName: string
  pageCount: number
}

/**
 * PDF 解密（#490）：上传已加密的 PDF → 输入密码 → qpdf-wasm 本地解密 →
 * 下载无密码的干净 PDF。qpdf --decrypt 为无损结构解密（非转图片），
 * 保留原内容与页数。密码只存于内存 state，解密完成立即清空。
 *
 * 错误状态存 MessageKey、渲染时才 t() 翻译：文案与 pdf-decrypt.i18n.json
 * 1:1 对应（词典由协调员合并，合并后 tsc 校验 key 对齐）。
 */
export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [pending, setPending] = useState<PendingFile | null>(null)
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<DecryptResult | null>(null)
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /**
   * 上传阶段校验：大小 → 魔数 → 加密探测。
   * 未加密的 PDF 直接提示无需解密；损坏的 PDF 在探测阶段归为“文件损坏”。
   */
  const handleFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setErrorKey(null)
    setResult(null)
    try {
      assertFileSizeOk(file.size)
    } catch {
      setErrorKey('pdfDecrypt.error.tooLarge')
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isPdfFile(bytes)) {
      setErrorKey('pdfDecrypt.error.unsupported')
      return
    }
    let kind: 'plain' | 'encrypted'
    try {
      kind = await probePdfEncryption(bytes)
    } catch {
      setErrorKey('pdfDecrypt.error.invalid')
      return
    }
    if (kind === 'plain') {
      setErrorKey('pdfDecrypt.error.notEncrypted')
      return
    }
    setPending({ name: file.name, bytes })
  }, [])

  /**
   * 解密：密码校验 → qpdf --decrypt → pdf-lib 校验输出合法并读页数。
   * 成功后立即清空密码输入（只存内存）。失败按种类转译为
   * “密码错误 / 解密失败”，不泄露密码与细节。
   * （解密按钮仅在 pending 非空时渲染，此处无需空守卫）
   */
  const handleDecrypt = useCallback(
    async (target: PendingFile) => {
      if (!validatePassword(password)) {
        setErrorKey('pdfDecrypt.error.emptyPassword')
        return
      }
      setProcessing(true)
      setErrorKey(null)
      try {
        const out = await runQpdf(target.bytes, buildDecryptArgs(password))
        // updateMetadata:false：只做合法性校验，避免 pdf-lib 盖章 Producer
        const doc = await PDFDocument.load(out, { updateMetadata: false })
        const pageCount = doc.getPageCount()
        // 拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
        const outCopy = new Uint8Array(out)
        const blob = new Blob([outCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          fileName: buildOutputFileName(target.name),
          pageCount,
        })
        // 密码只存内存：解密完成立即清空输入框
        setPassword('')
      } catch (err) {
        setErrorKey(DECRYPT_FAILURE_KEYS[classifyDecryptError(err)])
        setResult(null)
      } finally {
        setProcessing(false)
      }
    },
    [password],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setPending(null)
    setPassword('')
    setResult(null)
    setErrorKey(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfDecrypt.note')}</p>

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
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
          }}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {pending ? pending.name : t('pdfDecrypt.dropHint')}
        </p>
      </label>

      {/* 密码区：仅在已确认“文件已加密”后出现 */}
      {pending && !result && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            {t('pdfDecrypt.passwordLabel')}
            <input
              data-testid="password-input"
              type="password"
              value={password}
              placeholder={t('pdfDecrypt.passwordPlaceholder')}
              onChange={(e) => setPassword(e.target.value)}
              className="w-64 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('pdfDecrypt.securityNote')}
          </p>
          <button
            data-testid="decrypt"
            type="button"
            disabled={processing}
            onClick={() => void handleDecrypt(pending)}
            className="w-fit rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t('pdfDecrypt.decrypt')}
          </button>
        </div>
      )}

      {(pending || result) && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('pdfDecrypt.reset')}
        </button>
      )}

      {processing && <p data-testid="processing">{t('pdfDecrypt.processing')}</p>}
      {errorKey && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(errorKey)}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfDecrypt.resultInfo')}：{result.pageCount}
            {t('pdfDecrypt.pageUnit')}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfDecrypt.download')}
          </button>
        </div>
      )}
    </div>
  )
}
