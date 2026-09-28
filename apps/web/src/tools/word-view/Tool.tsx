import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  assertDocxFile,
  assertNonEmptyPreview,
  buildPreview,
  exactBuffer,
  previewToDocument,
} from './utils'
import type { WordPreview } from './utils'
import type { WordViewInput, WordViewOptions } from './schema'

type RunStatus = 'idle' | 'busy' | 'done' | 'error'

interface ViewState {
  readonly status: RunStatus
  readonly preview: WordPreview | null
  readonly error: string
}

const IDLE_STATE: ViewState = { status: 'idle', preview: null, error: '' }

const EXAMPLE: WordViewInput = {
  text: '在右侧点「选择 Word 文档」，文档将在此预览为可阅读的 HTML。',
}

/**
 * mammoth 走动态导入：重型库只在用户真正选文件时加载，不进首屏包。
 * mammoth 官方只发布 browser 打包（mammoth.browser.js），没有该子路径的类型声明，
 * 受「每个工具恰好 8 个文件、不得外新增 d.ts」的约束，在此处就地抑制该导入的类型报错
 * （file-hash 的 spark-md5 亦用同一手法）。browser 构建在浏览器与 vitest(jsdom) 下
 * 均以 { arrayBuffer } 为输入。
 */
async function loadMammoth() {
  // @ts-expect-error mammoth browser 构建无类型声明（子路径导入）
  return import('mammoth/mammoth.browser')
}

/** 从 unknown 取中文错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function Tool() {
  const [view, setView] = useState<ViewState>(IDLE_STATE)

  /** 文件入口：mammoth 动态加载 → 转 HTML → 清洗存 state，渲染在 renderOutput */
  async function handleFile(file: File): Promise<void> {
    try {
      assertDocxFile(file)
    } catch (error) {
      setView({ ...IDLE_STATE, status: 'error', error: messageOf(error) })
      return
    }
    setView({ ...IDLE_STATE, status: 'busy' })
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (bytes.length === 0) throw new Error('文件为空，请选择有效的 .docx 文档')
      const mammoth = await loadMammoth()
      let rawHtml: string
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: exactBuffer(bytes) })
        rawHtml = String(result.value)
      } catch {
        throw new Error('文档解析失败：文件可能已损坏或不是有效的 .docx 文档')
      }
      const preview = buildPreview(file.name, rawHtml)
      assertNonEmptyPreview(preview.html)
      setView({ status: 'done', preview, error: '' })
    } catch (error) {
      setView((prev) => ({ ...prev, status: 'error', error: messageOf(error) }))
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file)
  }

  return (
    <MultiPanel<WordViewInput, WordViewOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="word-file" className={SECONDARY_BUTTON + ' cursor-pointer'}>
              选择 Word 文档
            </label>
            <input
              id="word-file"
              data-testid="file"
              type="file"
              accept=".docx"
              className="hidden"
              onChange={onFileChange}
            />
            {view.preview && (
              <span data-testid="file-name" className="text-xs text-slate-500 dark:text-slate-400">
                {view.preview.fileName}
                {view.preview.hasImages ? '（含图片）' : ''}
              </span>
            )}
          </div>

          {view.status === 'busy' && (
            <p data-testid="parsing" className="text-sm text-slate-500">
              正在解析 Word 文档…
            </p>
          )}

          {view.status === 'error' && view.error !== '' && (
            <p
              role="alert"
              data-testid="word-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {view.error}
            </p>
          )}

          {view.status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              选择 .docx 文档后，将在本地渲染为可阅读的 HTML
              预览：标题、段落、列表、表格保留语义，图片内嵌显示，「下载」可导出为独立网页文件。全程本地处理，不上传。
            </p>
          )}

          {view.status === 'done' && view.preview && (
            <div
              data-testid="word-preview"
              className="prose-sm max-w-none rounded border border-slate-200 p-4 dark:border-slate-700 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: view.preview.html }}
            />
          )}
        </div>
      )}
      toText={() => (view.preview ? previewToDocument(view.preview) : '')}
      downloadExt="html"
    />
  )
}
