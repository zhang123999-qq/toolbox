import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { previewPptxFile, previewToText } from './utils'
import type { PptPreview } from './utils'
import type { PptViewInput, PptViewOptions } from './schema'

type RunStatus = 'idle' | 'busy' | 'done' | 'error'

interface ViewState {
  readonly status: RunStatus
  readonly preview: PptPreview | null
  readonly active: number
  readonly error: string
}

const IDLE_STATE: ViewState = { status: 'idle', preview: null, active: 0, error: '' }

const EXAMPLE: PptViewInput = { text: '在右侧点「选择 PPT 文件」，幻灯片文本将在此逐张预览。' }

/** 从 unknown 取中文错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function Tool() {
  const [view, setView] = useState<ViewState>(IDLE_STATE)

  /** 文件入口：fflate 本地解包 → 幻灯片文本存 state，渲染在 renderOutput */
  async function handleFile(file: File): Promise<void> {
    setView({ ...IDLE_STATE, status: 'busy' })
    try {
      const preview = await previewPptxFile(file)
      setView({ status: 'done', preview, active: 0, error: '' })
    } catch (error) {
      setView({ ...IDLE_STATE, status: 'error', error: messageOf(error) })
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file)
  }

  function go(delta: number) {
    setView((prev) => {
      const total = prev.preview?.slides.length ?? 0
      if (total === 0) return prev
      return { ...prev, active: (prev.active + delta + total) % total }
    })
  }

  const slide = view.preview?.slides[view.active] ?? null
  const total = view.preview?.slides.length ?? 0

  return (
    <MultiPanel<PptViewInput, PptViewOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="ppt-file" className={SECONDARY_BUTTON + ' cursor-pointer'}>
              选择 PPT 文件
            </label>
            <input
              id="ppt-file"
              data-testid="file"
              type="file"
              accept=".pptx"
              className="hidden"
              onChange={onFileChange}
            />
            {view.preview && (
              <span data-testid="file-name" className="text-xs text-slate-500 dark:text-slate-400">
                {view.preview.fileName}
              </span>
            )}
          </div>

          {view.status === 'busy' && (
            <p data-testid="parsing" className="text-sm text-slate-500">
              正在解析 PPT 文件…
            </p>
          )}

          {view.status === 'error' && view.error !== '' && (
            <p
              role="alert"
              data-testid="ppt-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {view.error}
            </p>
          )}

          {view.status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              选择 .pptx 文件后，将在本地按幻灯片提取文本预览：标题与段落逐张展示，可用上一张 /
              下一张切换，「下载」导出为纯文本。全程本地处理，不上传。注意：这是文本级预览，不还原排版与图片。
            </p>
          )}

          {view.status === 'done' && view.preview && slide && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="prev-slide"
                  className={SECONDARY_BUTTON}
                  disabled={total <= 1}
                  onClick={() => go(-1)}
                >
                  上一张
                </button>
                <span
                  data-testid="slide-counter"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  第 {slide.index} / {total} 张
                </span>
                <button
                  type="button"
                  data-testid="next-slide"
                  className={SECONDARY_BUTTON}
                  disabled={total <= 1}
                  onClick={() => go(1)}
                >
                  下一张
                </button>
              </div>
              <div
                data-testid="slide-content"
                className="rounded border border-slate-200 p-4 dark:border-slate-700"
              >
                {slide.paragraphs.length === 0 ? (
                  <p className="text-sm text-slate-400">（空白幻灯片）</p>
                ) : (
                  <>
                    {slide.title !== '' && (
                      <h3 className="mb-2 text-base font-semibold">{slide.title}</h3>
                    )}
                    {slide.paragraphs.slice(slide.title !== '' ? 1 : 0).map((para, i) => (
                      <p key={i} className="mb-1 text-sm">
                        {para}
                      </p>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      toText={() => (view.preview ? previewToText(view.preview) : '')}
      downloadExt="txt"
    />
  )
}
