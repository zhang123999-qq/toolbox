import { useCallback, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  defaultFieldValue,
  describeForm,
  fillForm,
  isEncryptedPdfError,
  isPdfFile,
  loadPdf,
  truncateText,
  type FieldDescriptor,
  type FieldValue,
} from './utils'

interface LoadedForm {
  bytes: Uint8Array
  fileName: string
  fields: FieldDescriptor[]
}

interface Result {
  url: string
  blob: Blob
  fileName: string
  fieldCount: number
}

/**
 * PDF 表单填写（#492）：上传 PDF → loadPdf/describeForm 枚举字段 →
 * 按种类渲染编辑器（文本框/复选框/单选组/下拉框）→ 填写后导出新 PDF，
 * 可选拼合（flatten）。无表单字段显示空状态；加密/损坏的 PDF 明确报错。
 * 错误状态存 MessageKey、渲染时才 t() 翻译，文案见 pdf-form.i18n.json。
 */
export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [loaded, setLoaded] = useState<LoadedForm | null>(null)
  const [values, setValues] = useState<Record<number, FieldValue>>({})
  const [flatten, setFlatten] = useState(false)
  // 文本框发生截断的字段下标集合，用于显示“已截断”提示
  const [truncated, setTruncated] = useState<Record<number, boolean>>({})
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /**
   * 载入阶段校验：大小 → 魔数 → 可解析（加密单独转译）。
   * 解析成功后枚举字段；无字段也视为成功，由空状态展示。
   */
  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setErrorKey(null)
    setResult(null)
    setLoaded(null)
    setValues({})
    setTruncated({})
    setLoading(true)
    try {
      assertFileSizeOk(file.size)
    } catch {
      setErrorKey('pdfForm.error.tooLarge')
      setLoading(false)
      return
    }
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      if (!isPdfFile(buf)) {
        setErrorKey('pdfForm.error.unsupported')
        return
      }
      let fields: FieldDescriptor[]
      try {
        fields = describeForm(await loadPdf(buf))
      } catch (err) {
        if (isEncryptedPdfError(err)) setErrorKey('pdfForm.error.encrypted')
        else setErrorKey('pdfForm.error.invalid')
        return
      }
      setLoaded({ bytes: buf, fileName: file.name, fields })
    } finally {
      setLoading(false)
    }
  }, [])

  const setFieldValue = useCallback((index: number, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [index]: value }))
  }, [])

  /** 文本框输入：超 maxLength 时截断并标记，供界面显示截断提示 */
  const handleTextChange = useCallback(
    (d: FieldDescriptor, raw: string) => {
      const { value, truncated: wasTruncated } = truncateText(raw, d.maxLength)
      setFieldValue(d.index, value)
      setTruncated((prev) => ({ ...prev, [d.index]: wasTruncated }))
    },
    [setFieldValue],
  )

  /**
   * 导出：导出按钮仅在 loaded 非空且有字段时渲染，参数由调用方传入，
   * 此处无需空守卫。
   */
  const handleExport = useCallback(
    async (bytes: Uint8Array, fields: FieldDescriptor[], fileName: string) => {
      setExporting(true)
      setErrorKey(null)
      try {
        const entries = fields.map((d) => ({
          descriptor: d,
          value: values[d.index] ?? defaultFieldValue(d),
        }))
        const out = await fillForm(bytes, entries, flatten)
        // fillForm 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
        const copy = new Uint8Array(out)
        const blob = new Blob([copy.buffer as ArrayBuffer], { type: 'application/pdf' })
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          fileName: buildOutputFileName(fileName),
          fieldCount: fields.length,
        })
      } catch {
        setErrorKey('pdfForm.error.export')
        setResult(null)
      } finally {
        setExporting(false)
      }
    },
    [values, flatten],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setLoaded(null)
    setValues({})
    setTruncated({})
    setFlatten(false)
    setResult(null)
    setErrorKey(null)
  }, [])

  /** 按字段种类渲染编辑器；只读字段禁用输入并打标 */
  const renderEditor = (d: FieldDescriptor) => {
    const value = values[d.index] ?? defaultFieldValue(d)
    const testId = `field-input-${d.index}`
    if (d.kind === 'text') {
      // values 只存字符串（handleTextChange/defaultFieldValue 保证），此处直接断言
      const textValue = value as string
      const shared = {
        'data-testid': testId,
        disabled: d.readOnly,
        value: textValue,
        onChange: (
          e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>,
        ) => handleTextChange(d, e.target.value),
        className:
          'w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900',
      }
      return d.multiline ? <textarea {...shared} rows={3} /> : <input {...shared} type="text" />
    }
    if (d.kind === 'checkbox') {
      return (
        <input
          data-testid={testId}
          type="checkbox"
          checked={value === true}
          disabled={d.readOnly}
          onChange={(e) => setFieldValue(d.index, e.target.checked)}
          className="h-4 w-4"
        />
      )
    }
    if (d.kind === 'radio') {
      return (
        <div className="flex flex-wrap gap-3">
          {d.options.map((opt) => (
            <label key={opt} className="flex items-center gap-1 text-sm">
              <input
                data-testid={testId}
                type="radio"
                name={`pdf-form-radio-${d.index}`}
                value={opt}
                checked={value === opt}
                disabled={d.readOnly}
                onChange={() => setFieldValue(d.index, opt)}
                className="h-4 w-4"
              />
              {opt}
            </label>
          ))}
        </div>
      )
    }
    if (d.kind === 'dropdown') {
      // 无选项的下拉框不渲染 select，避免 pdf-lib select 抛错；给明确提示
      if (d.options.length === 0) {
        return (
          <p data-testid={`field-no-options-${d.index}`} className="text-sm text-slate-500">
            {t('pdfForm.noOptions')}
          </p>
        )
      }
      const optionEls = d.options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))
      const selectClass =
        'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900'
      return d.multiSelect ? (
        <select
          data-testid={testId}
          multiple
          disabled={d.readOnly}
          // 多选下拉只存 string[]（onChange/defaultFieldValue 保证），此处直接断言
          value={value as string[]}
          onChange={(e) =>
            setFieldValue(
              d.index,
              Array.from(e.target.selectedOptions, (o) => o.value),
            )
          }
          className={selectClass}
        >
          {optionEls}
        </select>
      ) : (
        <select
          data-testid={testId}
          disabled={d.readOnly}
          // 单选下拉只存 string（onChange/defaultFieldValue 保证），此处直接断言
          value={value as string}
          onChange={(e) => setFieldValue(d.index, e.target.value)}
          className={selectClass}
        >
          <option value="">{t('pdfForm.selectPlaceholder')}</option>
          {optionEls}
        </select>
      )
    }
    return (
      <p data-testid={`field-unsupported-${d.index}`} className="text-sm text-slate-500">
        {t('pdfForm.unsupportedHint')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfForm.note')}</p>

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
          void handleFile(e.dataTransfer.files?.[0])
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
            void handleFile(e.target.files?.[0])
          }}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {loaded ? loaded.fileName : t('pdfForm.dropHint')}
        </p>
      </label>

      {/* 表单字段区 */}
      {loaded && (
        <section data-testid="form-section" className="flex flex-col gap-3">
          {loaded.fields.length === 0 ? (
            <p data-testid="no-fields" className="text-sm text-slate-500 dark:text-slate-400">
              {t('pdfForm.noFields')}
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {loaded.fields.map((d) => (
                  <li
                    key={d.index}
                    data-testid={`field-${d.index}`}
                    className="rounded border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span data-testid={`field-name-${d.index}`} className="text-sm font-medium">
                        {d.name === '' ? `${t('pdfForm.unnamedField')} #${d.index + 1}` : d.name}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                        {d.kind === 'text' && t('pdfForm.type.text')}
                        {d.kind === 'checkbox' && t('pdfForm.type.checkbox')}
                        {d.kind === 'radio' && t('pdfForm.type.radio')}
                        {d.kind === 'dropdown' && t('pdfForm.type.dropdown')}
                        {d.kind === 'unsupported' && t('pdfForm.type.unsupported')}
                      </span>
                      {d.readOnly && (
                        <span
                          data-testid={`field-readonly-${d.index}`}
                          className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        >
                          {t('pdfForm.readOnly')}
                        </span>
                      )}
                    </div>
                    {renderEditor(d)}
                    {truncated[d.index] && (
                      <p
                        data-testid={`field-truncated-${d.index}`}
                        className="mt-1 text-xs text-amber-600 dark:text-amber-400"
                      >
                        {t('pdfForm.truncatedHint')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 text-sm">
                <input
                  data-testid="opt-flatten"
                  type="checkbox"
                  checked={flatten}
                  onChange={(e) => setFlatten(e.target.checked)}
                  className="h-4 w-4"
                />
                {t('pdfForm.flatten')}
              </label>
              <button
                data-testid="export"
                type="button"
                disabled={exporting}
                onClick={() => void handleExport(loaded.bytes, loaded.fields, loaded.fileName)}
                className="w-fit rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {t('pdfForm.export')}
              </button>
            </>
          )}
        </section>
      )}

      {loaded && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('pdfForm.reset')}
        </button>
      )}

      {loading && <p data-testid="loading">{t('pdfForm.loading')}</p>}
      {exporting && <p data-testid="exporting">{t('pdfForm.exporting')}</p>}
      {errorKey && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(errorKey)}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfForm.resultDone')}：{result.fieldCount}
            {t('pdfForm.fieldUnit')}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfForm.download')}
          </button>
        </div>
      )}
    </div>
  )
}
