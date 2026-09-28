import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { assertPptxFile, layoutSlideImage, parseImageSize, parsePptxPreview } from './utils'
import type { PptPreview, SlideImageOptions, SlideText } from './utils'
import type { PptToImageInput, PptToImageOptions } from './schema'

type RunStatus = 'idle' | 'busy' | 'done' | 'error'

interface SlideImage {
  readonly index: number
  readonly dataUrl: string
}

interface ViewState {
  readonly status: RunStatus
  readonly preview: PptPreview | null
  readonly images: readonly SlideImage[]
  readonly size: string
  readonly background: 'white' | 'dark'
  readonly error: string
}

const IDLE_STATE: ViewState = {
  status: 'idle',
  preview: null,
  images: [],
  size: '960x540',
  background: 'white',
  error: '',
}

const EXAMPLE: PptToImageInput = {
  text: '在右侧选择尺寸与背景，点「选择 PPT 文件」，每张幻灯片将在此渲染为 PNG。',
}

const SIZES = ['960x540', '1280x720', '800x600'] as const

/** 从 unknown 取中文错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * canvas 绘制：背景 → 文本行（layoutSlideImage 已算好版式）。
 * 纯浏览器 API，放在 Tool.tsx；版式计算在 utils（可单测）。
 */
function renderSlideImage(slide: SlideText, options: SlideImageOptions): string {
  const { width, height } = options
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持 canvas 2D 渲染，无法生成图片')
  const measure = (text: string, fontSize: number, bold: boolean): number => {
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px sans-serif`
    return ctx.measureText(text).width
  }
  const layout = layoutSlideImage(slide, options, measure)
  ctx.fillStyle = layout.background
  ctx.fillRect(0, 0, width, height)
  if (layout.empty) {
    const fontSize = Math.round(height * 0.05)
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = layout.placeholderColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('（空白幻灯片）', width / 2, height / 2)
  } else {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    for (const line of layout.lines) {
      ctx.font = `${line.bold ? 'bold ' : ''}${line.fontSize}px sans-serif`
      ctx.fillStyle = line.color
      ctx.fillText(line.text, line.x, line.y)
    }
  }
  return canvas.toDataURL('image/png')
}

function renderAll(preview: PptPreview, size: string, background: 'white' | 'dark'): SlideImage[] {
  const { width, height } = parseImageSize(size)
  return preview.slides.map((slide) => ({
    index: slide.index,
    dataUrl: renderSlideImage(slide, { width, height, background }),
  }))
}

export default function Tool() {
  const [view, setView] = useState<ViewState>(IDLE_STATE)
  // mirror：事件处理器里读取最新 state，避免闭包过期
  const viewRef = useRef(view)
  viewRef.current = view

  async function handleFile(file: File): Promise<void> {
    const { size, background } = viewRef.current
    setView((prev) => ({ ...prev, status: 'busy', error: '' }))
    try {
      assertPptxFile(file)
      const bytes = new Uint8Array(await file.arrayBuffer())
      const preview = parsePptxPreview(bytes, file.name)
      const images = renderAll(preview, size, background)
      setView((prev) => ({ ...prev, status: 'done', preview, images, error: '' }))
    } catch (error) {
      setView((prev) => ({ ...prev, status: 'error', error: messageOf(error) }))
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file)
  }

  /** 选项变更：已有解析结果时立即重渲染 */
  function rerenderWith(size: string, background: 'white' | 'dark'): void {
    const prev = viewRef.current
    if (!prev.preview) {
      setView({ ...prev, size, background })
      return
    }
    try {
      const images = renderAll(prev.preview, size, background)
      setView({ ...prev, size, background, images, status: 'done', error: '' })
    } catch (error) {
      setView({ ...prev, size, background, status: 'error', error: messageOf(error) })
    }
  }

  const dims = parseImageSize(view.size)

  return (
    <MultiPanel<PptToImageInput, PptToImageOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ size: '960x540', background: 'white' }}
      example={EXAMPLE}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              尺寸
              <select
                data-testid="size"
                aria-label="输出尺寸"
                className="rounded border border-slate-300 px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
                value={view.size}
                onChange={(event) => rerenderWith(event.target.value, view.background)}
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              背景
              <select
                data-testid="background"
                aria-label="背景"
                className="rounded border border-slate-300 px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
                value={view.background}
                onChange={(event) =>
                  rerenderWith(view.size, event.target.value as 'white' | 'dark')
                }
              >
                <option value="white">白色</option>
                <option value="dark">深色</option>
              </select>
            </label>
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
            <p data-testid="rendering" className="text-sm text-slate-500">
              正在渲染幻灯片…
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
              选择 .pptx 文件后，每张幻灯片将在本地渲染为 PNG 图片：标题置顶、正文依次排列，
              可逐张下载。全程本地处理，不上传。注意：这是基于提取文本的简化渲染，
              不还原原稿的排版、图形与图片。
            </p>
          )}

          {view.status === 'done' && (
            <div className="flex flex-col gap-3" data-testid="image-list">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                共 {view.images.length} 张 · {dims.width}×{dims.height} ·{' '}
                {view.background === 'dark' ? '深色背景' : '白色背景'}
              </p>
              {view.images.map((image) => (
                <figure key={image.index} className="flex flex-col gap-1">
                  <img
                    data-testid={`slide-image-${image.index}`}
                    src={image.dataUrl}
                    alt={`第 ${image.index} 张幻灯片`}
                    className="w-full rounded border border-slate-200 dark:border-slate-700"
                  />
                  <figcaption className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    第 {image.index} 张
                    <a
                      data-testid={`download-slide-${image.index}`}
                      href={image.dataUrl}
                      download={`slide-${image.index}.png`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      下载 PNG
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      )}
      toText={() =>
        view.images.length > 0
          ? `演示文稿：${view.preview?.fileName ?? ''}\n共渲染 ${view.images.length} 张幻灯片为 PNG（${dims.width}×${dims.height}，${view.background === 'dark' ? '深色' : '白色'}背景），请在页面上逐张下载。`
          : ''
      }
      downloadExt="txt"
    />
  )
}
