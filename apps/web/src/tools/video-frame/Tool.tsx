import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { VideoFrameFormOptions, VideoFrameInput } from './schema'
import {
  buildFilename,
  clampTime,
  fitSize,
  formatTime,
  parseTimeInput,
  secondsToSlider,
  sliderToSeconds,
  validateTime,
} from './utils'

export default function Tool() {
  const [fileName, setFileName] = useState('')
  const [objectUrl, setObjectUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [timeText, setTimeText] = useState('1')
  const [frameUrl, setFrameUrl] = useState('')
  const [frameName, setFrameName] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pendingTimeRef = useRef<number | null>(null)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '抓帧失败，请重试'
  }

  /** 选择视频文件 */
  function onFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const url = URL.createObjectURL(file)
      setObjectUrl((prev) => {
        if (prev) {
          try {
            URL.revokeObjectURL(prev)
          } catch {
            /* 忽略 */
          }
        }
        return url
      })
    } catch {
      setError('无法读取该视频文件，请换一个试试')
      return
    }
    setFileName(file.name)
    setDuration(0)
    setFrameUrl('')
    setFrameName('')
    setStatus('')
    setError('')
    setTimeText('1')
  }

  /** 视频元数据就绪：记录时长与分辨率 */
  function onLoadedMetadata(event: React.SyntheticEvent<HTMLVideoElement>): void {
    const v = event.currentTarget
    setDuration(v.duration)
    setStatus(`已加载：时长 ${formatTime(v.duration)}，分辨率 ${v.videoWidth}×${v.videoHeight}`)
  }

  /** seek 完成后执行抓帧 */
  function onSeeked(): void {
    const t = pendingTimeRef.current
    pendingTimeRef.current = null
    if (t === null) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      setError('抓帧失败：缺少视频或画布')
      return
    }
    try {
      const { width, height } = fitSize(video.videoWidth, video.videoHeight)
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('当前浏览器不支持 canvas，无法抓帧')
        return
      }
      ctx.drawImage(video, 0, 0, width, height)
      const url = canvas.toDataURL('image/png')
      setFrameUrl(url)
      setFrameName(buildFilename(fileName || 'video', t))
      setStatus(`已抓取 ${formatTime(t)} 的画面`)
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  /** 抓帧：校验时间 → seek → 等 seeked 事件绘制 */
  function capture(): void {
    setError('')
    if (!objectUrl || duration <= 0) {
      setError('请先选择视频文件并等待加载完成')
      return
    }
    let t: number
    try {
      t = validateTime(parseTimeInput(timeText), duration)
      optionsSchema.parse({ time: t })
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    const video = videoRef.current
    if (!video) {
      setError('抓帧失败：缺少视频元素')
      return
    }
    pendingTimeRef.current = t
    try {
      video.currentTime = t
    } catch (err) {
      pendingTimeRef.current = null
      setError(toChineseError(err))
    }
  }

  // 卸载时释放 object URL
  useEffect(() => {
    return () => {
      setObjectUrl((prev) => {
        if (prev) {
          try {
            URL.revokeObjectURL(prev)
          } catch {
            /* 忽略 */
          }
        }
        return ''
      })
    }
  }, [])

  const loaded = objectUrl !== '' && duration > 0
  let sliderValue = 0
  try {
    sliderValue = secondsToSlider(clampTime(parseTimeInput(timeText), duration), duration)
  } catch {
    sliderValue = 0
  }

  return (
    <MultiPanel<VideoFrameInput, VideoFrameFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ time: 1 }}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="vf-file" className="text-sm text-slate-600 dark:text-slate-400">
              视频文件
            </label>
            <input
              id="vf-file"
              data-testid="video-input"
              type="file"
              accept="video/*"
              className="text-sm"
              onChange={onFileChange}
            />
          </div>
          {objectUrl !== '' && (
            <video
              ref={videoRef}
              data-testid="video"
              src={objectUrl}
              className="max-h-64 w-full rounded bg-black"
              controls
              preload="metadata"
              muted
              playsInline
              onLoadedMetadata={onLoadedMetadata}
              onSeeked={onSeeked}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="vf-time" className="text-sm text-slate-600 dark:text-slate-400">
              时间点
            </label>
            <input
              id="vf-time"
              data-testid="time-input"
              type="text"
              inputMode="decimal"
              placeholder="秒，如 90.5 或 1:30.5"
              className="w-36 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={timeText}
              onChange={(event) => setTimeText(event.target.value)}
            />
            {loaded && (
              <input
                data-testid="seek"
                type="range"
                min={0}
                max={1000}
                value={sliderValue}
                className="min-w-40 flex-1"
                aria-label="拖动定位时间点"
                onChange={(event) =>
                  setTimeText(sliderToSeconds(Number(event.target.value), duration).toFixed(2))
                }
              />
            )}
            <button
              type="button"
              data-testid="capture"
              disabled={!loaded}
              className="rounded bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
              onClick={capture}
            >
              抓取该帧
            </button>
          </div>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {status ? (
            <p data-testid="frame-status" className="text-sm text-slate-700 dark:text-slate-300">
              {status}
            </p>
          ) : null}
          <canvas ref={canvasRef} data-testid="frame-canvas" className="hidden" />
          {frameUrl !== '' ? (
            <div className="flex flex-col gap-2">
              <img
                data-testid="frame-preview"
                src={frameUrl}
                alt="抓取的视频帧"
                className="max-h-64 w-auto self-start rounded border border-slate-200 dark:border-slate-700"
              />
              <a
                data-testid="download-frame"
                href={frameUrl}
                download={frameName}
                className="self-start rounded bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90"
              >
                下载 PNG（{frameName}）
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              选择视频后，输入时间点（秒，如 90.5 或 1:30.5，也可拖滑杆），点「抓取该帧」。
            </p>
          )}
        </div>
      )}
      toText={() => (frameName !== '' ? `已抓帧：${frameName}` : '')}
      downloadExt="txt"
    />
  )
}
