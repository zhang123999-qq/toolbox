import { useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { VideoThumbnailFormOptions, VideoThumbnailInput } from './schema'
import {
  formatBytes,
  formatSeconds,
  gridDims,
  parseTimestamps,
  thumbnailFileName,
  validateTimestamps,
} from './utils'

/** 单文件上限 500 MiB：视频文件通常较大 */
const MAX_FILE_BYTES = 500 * 1024 * 1024
/** 单次跳转超时（毫秒）：解码卡住时给中文提示而不是无限等待 */
const SEEK_TIMEOUT_MS = 8000

interface Thumb {
  readonly ts: number
  readonly url: string
}

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly thumbs: readonly Thumb[]
  readonly cols: number
}

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const optionDefs: readonly OptionDef<VideoThumbnailFormOptions>[] = [
    {
      key: 'timestamps',
      label: '时间点（秒）',
      kind: 'text',
      placeholder: '0.5, 2, 5',
    },
    { key: 'columns', label: '每行列数', kind: 'text', placeholder: '3' },
  ]

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 把 video 跳到指定秒数，等待 seeked 事件；超时抛中文错 */
  function seekTo(video: HTMLVideoElement, ts: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup()
        reject(new Error(`跳转到 ${formatSeconds(ts)} 超时：视频解码可能卡住，换个时间点试试`))
      }, SEEK_TIMEOUT_MS)
      const onSeeked = () => {
        cleanup()
        resolve()
      }
      const cleanup = () => {
        window.clearTimeout(timer)
        video.removeEventListener('seeked', onSeeked)
      }
      video.addEventListener('seeked', onSeeked)
      try {
        video.currentTime = ts
      } catch (err) {
        cleanup()
        reject(err)
      }
    })
  }

  /** 逐个时间点跳转并截取当前帧为 PNG dataURL */
  async function captureThumbs(timestamps: readonly number[]): Promise<readonly Thumb[]> {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video) throw new Error('视频元素尚未就绪，请重试')
    if (!canvas) throw new Error('截取画布尚未就绪，请重试')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前环境不支持 Canvas 2D，无法截取视频帧')
    const out: Thumb[] = []
    for (const ts of timestamps) {
      await seekTo(video, ts)
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      out.push({ ts, url: canvas.toDataURL('image/png') })
    }
    return out
  }

  /** 纯处理：参数校验 → 逐帧截取 → 发布；抛错由调用方统一转中文 */
  async function process(
    name: string,
    videoDuration: number,
    raw: VideoThumbnailFormOptions,
  ): Promise<void> {
    const opts = optionsSchema.parse(raw)
    const timestamps = parseTimestamps(opts.timestamps)
    validateTimestamps(timestamps, videoDuration)
    const { cols } = gridDims(timestamps.length, opts.columns)
    const thumbs = await captureThumbs(timestamps)
    const report = [
      `输入：${name}`,
      `视频时长：${formatSeconds(videoDuration)}`,
      `截取时间点：${timestamps.map((t) => formatSeconds(t)).join('、')}`,
      `共 ${thumbs.length} 张缩略图，每张可单独下载 PNG。`,
    ].join('\n')
    setResult({ fileName: name, report, thumbs, cols })
  }

  /** 选择文件：大小检查 → 参数预校验 → 交给 video 元素加载 */
  function handleFile(file: File, raw: VideoThumbnailFormOptions): void {
    setError('')
    setPending(true)
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          `文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
        )
      }
      // 先做纯参数校验，时间点写错就不必加载视频
      const opts = optionsSchema.parse(raw)
      parseTimestamps(opts.timestamps)
      gridDims(1, opts.columns)
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setSourceName(file.name)
      setResult(null)
    } catch (err) {
      setError(toChineseError(err))
      setPending(false)
    }
  }

  /** video 元数据就绪：读时长 → 校验时间点 → 截取 */
  async function handleLoadedMetadata(raw: VideoThumbnailFormOptions): Promise<void> {
    const video = videoRef.current
    try {
      const d = video?.duration ?? Number.NaN
      validateTimestamps(parseTimestamps(optionsSchema.parse(raw).timestamps), d)
      setDuration(d)
      await process(sourceName || 'video', d, raw)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  /** 修改参数后重新截取（复用已加载的视频，不必重新选文件） */
  function handleReprocess(raw: VideoThumbnailFormOptions): void {
    if (!videoUrl) {
      setError('请先选择视频文件')
      return
    }
    setError('')
    setPending(true)
    void (async () => {
      try {
        await process(sourceName || 'video', duration, raw)
      } catch (err) {
        setError(toChineseError(err))
        setResult(null)
      } finally {
        setPending(false)
      }
    })()
  }

  return (
    <MultiPanel<VideoThumbnailInput, VideoThumbnailFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ timestamps: '0.5, 2, 5', columns: '3' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="video-thumbnail-file">
              选择视频文件
            </label>
            <input
              id="video-thumbnail-file"
              type="file"
              accept="video/*"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) handleFile(f, options)
                event.target.value = ''
              }}
            />
            {sourceName ? (
              <span data-testid="file-name" className="text-sm text-slate-600 dark:text-slate-400">
                {sourceName}
              </span>
            ) : null}
            {videoUrl ? (
              <button
                type="button"
                data-testid="reprocess"
                className={SECONDARY_BUTTON}
                onClick={() => handleReprocess(options)}
              >
                重新截取
              </button>
            ) : null}
          </div>
          {pending ? <p className="text-sm text-slate-500">处理中…</p> : null}
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {/* 隐藏的视频与画布：只做解码与截取用，不展示 */}
          <video
            ref={videoRef}
            data-testid="video"
            className="hidden"
            muted
            playsInline
            preload="auto"
            src={videoUrl || undefined}
            onLoadedMetadata={() => void handleLoadedMetadata(options)}
          />
          <canvas ref={canvasRef} data-testid="capture-canvas" className="hidden" />
          {result ? (
            <div className="flex flex-col gap-2">
              <p
                data-testid="result-info"
                className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
              >
                {result.report}
              </p>
              <div
                data-testid="thumbs-grid"
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${result.cols}, minmax(0, 1fr))` }}
              >
                {result.thumbs.map((thumb, i) => (
                  <figure key={thumb.ts} className="flex flex-col gap-1">
                    <img
                      src={thumb.url}
                      alt={`${formatSeconds(thumb.ts)} 的视频帧`}
                      data-testid={`thumb-${i}`}
                      className="w-full rounded border border-slate-200 dark:border-slate-800"
                    />
                    <figcaption className="flex items-center justify-between text-xs text-slate-500">
                      <span>{formatSeconds(thumb.ts)}</span>
                      <a
                        href={thumb.url}
                        download={thumbnailFileName(result.fileName, i)}
                        data-testid={`download-thumb-${i}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        下载 PNG
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择视频文件，在「时间点」里填多个秒数（逗号 / 空格 /
              换行分隔），加载后自动截取缩略图。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
