import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  CONVERSION_MATRIX,
  assertConvertFile,
  baseName,
  bytesToBase64,
  csvTextToJson,
  csvTextToMarkdown,
  csvTextToXlsxBytes,
  detectSourceType,
  exactBuffer,
  jsonTextToCsv,
  jsonTextToXlsxBytes,
  mimeOf,
  readWorkbook,
  workbookToCsv,
  workbookToJson,
  workbookToMarkdown,
} from './utils'
import type { SourceType, TargetFormat } from './utils'
import type { DocConvertInput, DocConvertOptions } from './schema'

/**
 * mammoth 走动态导入：重型库只在用户真正转换 docx 时加载，不进首屏包。
 * mammoth 官方只发布 browser 打包（mammoth.browser.js），没有该子路径的类型声明，
 * 受「每个工具恰好 8 个文件、不得外新增 d.ts」的约束，在此处就地抑制该导入的类型报错
 * （word-to-html 等工具亦用同一手法）。
 */
async function loadMammoth() {
  // @ts-expect-error mammoth browser 构建无类型声明（子路径导入）
  return import('mammoth/mammoth.browser')
}

type RunStatus = 'idle' | 'busy' | 'done' | 'error'

interface SourceData {
  readonly fileName: string
  readonly sourceType: SourceType
  readonly bytes: Uint8Array
  /** 文本类源（csv/json）的解码文本；docx/xlsx 为空串 */
  readonly text: string
}

interface ConvertResult {
  /** 含目标扩展名的下载文件名 */
  readonly fileName: string
  readonly mime: string
  readonly text: string | null
  readonly bytes: Uint8Array | null
}

interface ViewState {
  readonly status: RunStatus
  readonly source: SourceData | null
  readonly target: TargetFormat | ''
  readonly result: ConvertResult | null
  readonly downloadUrl: string
  readonly error: string
}

const IDLE_STATE: ViewState = {
  status: 'idle',
  source: null,
  target: '',
  result: null,
  downloadUrl: '',
  error: '',
}

const EXAMPLE: DocConvertInput = {
  text: '在右侧选择文件并挑目标格式，转换结果将在此预览并可下载。',
}

const PREVIEW_LIMIT = 3000

/** 从 unknown 取中文错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 转换编排：docx 走 mammoth（动态加载），表格类走 utils 的 xlsx 纯函数。
 * 空 docx（无文本内容）视为错误；表格类空结果合法（如空表转出 []）。
 */
async function convertSource(source: SourceData, target: TargetFormat): Promise<ConvertResult> {
  const fileName = `${baseName(source.fileName)}.${target}`
  const mime = mimeOf(target)
  if (source.sourceType === 'docx') {
    const mammoth = await loadMammoth()
    const input = { arrayBuffer: exactBuffer(source.bytes) }
    let value: string
    try {
      if (target === 'txt') value = String((await mammoth.extractRawText(input)).value)
      else if (target === 'md') value = String((await mammoth.convertToMarkdown(input)).value)
      else value = String((await mammoth.convertToHtml(input)).value)
    } catch {
      throw new Error('文档解析失败：文件可能已损坏或不是有效的 .docx 文件')
    }
    if (value.trim() === '') throw new Error('文档中没有可转换的文本内容')
    return { fileName, mime, text: value, bytes: null }
  }
  if (source.sourceType === 'xlsx') {
    const workbook = readWorkbook(source.bytes)
    if (target === 'json') return { fileName, mime, text: workbookToJson(workbook), bytes: null }
    if (target === 'csv') return { fileName, mime, text: workbookToCsv(workbook), bytes: null }
    return { fileName, mime, text: workbookToMarkdown(workbook), bytes: null }
  }
  if (source.sourceType === 'csv') {
    if (target === 'json') return { fileName, mime, text: csvTextToJson(source.text), bytes: null }
    if (target === 'md')
      return { fileName, mime, text: csvTextToMarkdown(source.text), bytes: null }
    return { fileName, mime, text: null, bytes: csvTextToXlsxBytes(source.text) }
  }
  if (target === 'csv') return { fileName, mime, text: jsonTextToCsv(source.text), bytes: null }
  return { fileName, mime, text: null, bytes: jsonTextToXlsxBytes(source.text) }
}

export default function Tool() {
  const [view, setView] = useState<ViewState>(IDLE_STATE)
  // mirror：事件处理器里读取最新 state，避免闭包过期
  const viewRef = useRef(view)
  viewRef.current = view
  const urlRef = useRef('')

  function makeDownloadUrl(result: ConvertResult): string {
    const bytes: Uint8Array<ArrayBuffer> =
      result.text !== null
        ? new TextEncoder().encode(result.text)
        : (result.bytes as Uint8Array<ArrayBuffer>)
    try {
      if (urlRef.current.startsWith('blob:')) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(new Blob([bytes], { type: result.mime }))
      urlRef.current = url
      return url
    } catch {
      // jsdom 等环境不支持 Blob URL 时降级为 data URL，下载依然可用
      const url = `data:${result.mime};base64,${bytesToBase64(bytes)}`
      urlRef.current = url
      return url
    }
  }

  async function runConvert(source: SourceData, target: TargetFormat): Promise<void> {
    setView((prev) => ({ ...prev, status: 'busy', error: '' }))
    try {
      const result = await convertSource(source, target)
      const downloadUrl = makeDownloadUrl(result)
      setView((prev) => ({ ...prev, status: 'done', target, result, downloadUrl, error: '' }))
    } catch (error) {
      setView((prev) => ({ ...prev, status: 'error', error: messageOf(error) }))
    }
  }

  async function handleFile(file: File): Promise<void> {
    setView((prev) => ({ ...prev, status: 'busy', error: '' }))
    try {
      assertConvertFile(file)
      const sourceType = detectSourceType(file.name)
      const bytes = new Uint8Array(await file.arrayBuffer())
      const text =
        sourceType === 'csv' || sourceType === 'json' ? new TextDecoder().decode(bytes) : ''
      const source: SourceData = { fileName: file.name, sourceType, bytes, text }
      setView((prev) => ({ ...prev, source }))
      const defaultTarget = CONVERSION_MATRIX[sourceType][0]?.value ?? 'txt'
      await runConvert(source, defaultTarget)
    } catch (error) {
      setView((prev) => ({ ...prev, status: 'error', error: messageOf(error) }))
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file)
  }

  function onTargetChange(target: TargetFormat) {
    const source = viewRef.current.source
    if (source) void runConvert(source, target)
    else setView((prev) => ({ ...prev, target }))
  }

  const targets = view.source ? CONVERSION_MATRIX[view.source.sourceType] : []
  const previewText = view.result?.text ?? null

  return (
    <MultiPanel<DocConvertInput, DocConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ target: 'txt' }}
      example={EXAMPLE}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="doc-file" className={SECONDARY_BUTTON + ' cursor-pointer'}>
              选择文件
            </label>
            <input
              id="doc-file"
              data-testid="file"
              type="file"
              accept=".docx,.xlsx,.xls,.csv,.json"
              className="hidden"
              onChange={onFileChange}
            />
            <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              目标格式
              <select
                data-testid="target"
                aria-label="目标格式"
                disabled={!view.source}
                className="rounded border border-slate-300 px-1 py-0.5 text-xs disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
                value={view.target}
                onChange={(event) => onTargetChange(event.target.value as TargetFormat)}
              >
                {view.source ? null : <option value="">请先选择文件</option>}
                {targets.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {view.source && (
              <span data-testid="file-name" className="text-xs text-slate-500 dark:text-slate-400">
                {view.source.fileName}
              </span>
            )}
          </div>

          {view.status === 'busy' && (
            <p data-testid="converting" className="text-sm text-slate-500">
              正在转换…
            </p>
          )}

          {view.status === 'error' && view.error !== '' && (
            <p
              role="alert"
              data-testid="convert-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {view.error}
            </p>
          )}

          {view.status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              支持的转换：Word（.docx）→ 纯文本 / 网页 / Markdown；Excel（.xlsx / .xls）→ JSON / CSV
              / Markdown；CSV → JSON / Markdown / Excel；JSON → CSV / Excel。全程本地处理，不上传。
            </p>
          )}

          {view.status === 'done' && view.result && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  data-testid="download-file"
                  href={view.downloadUrl}
                  download={view.result.fileName}
                  className={SECONDARY_BUTTON}
                >
                  下载 {view.result.fileName}
                </a>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {view.result.mime}
                </span>
              </div>
              {previewText !== null ? (
                <pre
                  data-testid="preview"
                  className="max-h-96 overflow-auto whitespace-pre-wrap rounded border border-slate-200 p-3 text-xs dark:border-slate-700"
                >
                  {previewText.length > PREVIEW_LIMIT
                    ? previewText.slice(0, PREVIEW_LIMIT) +
                      `\n…（预览截断，全文共 ${previewText.length} 字符，请下载查看）`
                    : previewText}
                </pre>
              ) : (
                <p
                  data-testid="preview-binary"
                  className="text-sm text-slate-500 dark:text-slate-400"
                >
                  二进制 Excel 文件，共 {view.result.bytes?.length ?? 0} 字节，请点击下载后用 Excel
                  / WPS 打开。
                </p>
              )}
            </div>
          )}
        </div>
      )}
      toText={() => view.result?.text ?? ''}
      downloadExt="txt"
    />
  )
}
