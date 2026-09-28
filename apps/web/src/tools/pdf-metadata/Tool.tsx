import { useCallback, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import { metadataFormSchema, type PdfMetadataForm } from './schema'
import {
  applyPdfMetadata,
  assertFileSizeOk,
  buildOutputFileName,
  formatPdfDate,
  isPdfFile,
  joinKeywords,
  parseKeywords,
  pdfErrorMessage,
  readPdfMetadata,
  textOrEmpty,
  type PdfMetadata,
} from './utils'

/** 已加载的 PDF：原始字节 + 解析出的元数据 */
interface LoadedPdf {
  bytes: Uint8Array
  meta: PdfMetadata
}

interface Result {
  url: string
  blob: Blob
  fileName: string
  size: number
  pageCount: number
}

type EditableField = 'title' | 'author' | 'subject' | 'keywords'

const EDITABLE_FIELDS: readonly EditableField[] = ['title', 'author', 'subject', 'keywords']

/**
 * 可编辑字段 → 字段名 i18n key。
 * 文案由本工具的 pdf-metadata.i18n.json 提供（主流程合并进 messages 后进入
 * MessageKey 联合类型）；变量 key 传给 t() 时用 MessageKey 标注，不用 as 断言。
 */
const FIELD_LABEL_KEYS: Record<EditableField, MessageKey> = {
  title: 'pdfMetadata.field.title',
  author: 'pdfMetadata.field.author',
  subject: 'pdfMetadata.field.subject',
  keywords: 'pdfMetadata.field.keywords',
}

const EMPTY_FORM: PdfMetadataForm = { title: '', author: '', subject: '', keywords: '' }

export default function Tool() {
  const { t, locale } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null)
  const [form, setForm] = useState<PdfMetadataForm>(EMPTY_FORM)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File) => {
      setProcessing(true)
      setError(null)
      setResult(null)
      try {
        assertFileSizeOk(file.size)
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(bytes)) throw new Error(t('pdfMetadata.error.unsupported'))
        const meta = await readPdfMetadata(bytes)
        setLoaded({ bytes, meta })
        setForm({
          title: meta.title ?? '',
          author: meta.author ?? '',
          subject: meta.subject ?? '',
          keywords: joinKeywords(meta.keywords),
        })
        setFileName(file.name)
      } catch (err) {
        setError(pdfErrorMessage(err, t('pdfMetadata.error.encrypted')))
        setLoaded(null)
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

  const handleSave = useCallback(
    async (pdf: LoadedPdf, values: PdfMetadataForm) => {
      setProcessing(true)
      setError(null)
      try {
        const parsed = metadataFormSchema.parse(values)
        const { bytes, pageCount } = await applyPdfMetadata(pdf.bytes, {
          title: parsed.title,
          author: parsed.author,
          subject: parsed.subject,
          keywords: parseKeywords(parsed.keywords),
        })
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setResult({
          url,
          blob,
          fileName: buildOutputFileName(fileName),
          size: bytes.length,
          pageCount,
        })
        // 用保存后的字节刷新展示（未改字段原样保留，可直观核对）
        const meta = await readPdfMetadata(bytes)
        setLoaded({ bytes, meta })
      } catch (err) {
        setError(pdfErrorMessage(err, t('pdfMetadata.error.encrypted')))
      } finally {
        setProcessing(false)
      }
    },
    [fileName, t],
  )

  const handleClear = useCallback(() => {
    setForm(EMPTY_FORM)
  }, [])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setLoaded(null)
    setForm(EMPTY_FORM)
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  const emptyText = t('pdfMetadata.emptyValue')

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfMetadata.note')}</p>

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
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfMetadata.dropHint')}
        </p>
      </label>

      {/* 元数据查看与编辑：loaded 非空才渲染，TS 已收窄，无需空守卫 */}
      {loaded && (
        <div data-testid="meta-view" className="flex flex-col gap-4">
          <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="mb-3 text-sm font-semibold">{t('pdfMetadata.section.meta')}</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="shrink-0 text-slate-500">{t('pdfMetadata.field.creator')}</dt>
                <dd data-testid="meta-creator" className="break-all">
                  {textOrEmpty(loaded.meta.creator, emptyText)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-slate-500">{t('pdfMetadata.field.producer')}</dt>
                <dd data-testid="meta-producer" className="break-all">
                  {textOrEmpty(loaded.meta.producer, emptyText)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-slate-500">{t('pdfMetadata.field.creationDate')}</dt>
                <dd data-testid="meta-creationDate">
                  {formatPdfDate(loaded.meta.creationDate, emptyText, locale)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-slate-500">
                  {t('pdfMetadata.field.modificationDate')}
                </dt>
                <dd data-testid="meta-modificationDate">
                  {formatPdfDate(loaded.meta.modificationDate, emptyText, locale)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-slate-500">{t('pdfMetadata.field.pageCount')}</dt>
                <dd data-testid="meta-pageCount">{loaded.meta.pageCount}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="mb-3 text-sm font-semibold">{t('pdfMetadata.section.edit')}</h2>
            <div className="flex flex-col gap-3">
              {EDITABLE_FIELDS.map((field) => (
                <label key={field} className="flex flex-col gap-1 text-sm">
                  <span>{t(FIELD_LABEL_KEYS[field])}</span>
                  <input
                    data-testid={`field-${field}`}
                    type="text"
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                  />
                  {field === 'keywords' && (
                    <span className="text-xs text-slate-500">{t('pdfMetadata.keywordsHint')}</span>
                  )}
                </label>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              data-testid="save"
              type="button"
              onClick={() => void handleSave(loaded, form)}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t('pdfMetadata.save')}
            </button>
            <button
              data-testid="clear"
              type="button"
              onClick={handleClear}
              className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              {t('pdfMetadata.clear')}
            </button>
            <button
              data-testid="reset"
              type="button"
              onClick={handleReset}
              className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              {t('pdfMetadata.reset')}
            </button>
          </div>
        </div>
      )}

      {processing && <p data-testid="processing">{t('pdfMetadata.processing')}</p>}
      {/* 错误态：error 非 null 即展示（而非 error &&），避免空文案时静默吞掉错误态 */}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染下载按钮，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfMetadata.savedAs')}
            {result.fileName} · {formatBytes(result.size)} · {result.pageCount}{' '}
            {t('pdfMetadata.pageUnit')}
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfMetadata.download')}
          </button>
        </div>
      )}
    </div>
  )
}
