import { useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { VideoToGifFormOptions, VideoToGifInput } from './schema'
import { buildGifArgs, formatBytes, formatSeconds, gifFileName, gifMimeType } from './utils'

/** 单文件上限 200 MiB */
const MAX_FILE_BYTES = 200 * 1024 * 1024

/** ffmpeg.wasm 实例类型（只在 Tool 内使用，不静态引入以免首屏加载 wasm） */
interface FFmpegInstance {
  load: () => Promise<void>
  writeFile: (path: string, data: Uint8Array) => Promise<boolean>
  exec: (args: string[]) => Promise<number>
  readFile: (path: string) => Promise<Uint8Array | string>
}

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly bytes: number
}

/**
 * 动态加载 ffmpeg.wasm。
 * 必须动态 import（顶层静态引入会拖慢首屏）；加载失败抛中文错，调用方负责展示并降级。
 */
async function loadFFmpeg(): Promise<FFmpegInstance> {
  let mod: unknown
  try {
    mod = await import('@ffmpeg/ffmpeg')
  } catch {
    throw new Error('ffmpeg 组件加载失败：无法下载 @ffmpeg/ffmpeg 模块，请检查网络后重试')
  }
  const { FFmpeg } = mod as { FFmpeg: new () => FFmpegInstance }
  const ffmpeg = new FFmpeg()
  try {
    await ffmpeg.load()
  } catch {
    throw new Error('ffmpeg 内核加载失败：无法下载 wasm 内核文件（需要访问 CDN），请检查网络后重试')
  }
  return ffmpeg
}

/** ffmpeg 虚拟文件序号（模块级，避免 react-hooks/purity 误报） */
let ffmpegFileSeq = 0

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const ffmpegRef = useRef<FFmpegInstance | null>(null)

  const optionDefs: readonly OptionDef<VideoToGifFormOptions>[] = [
    { key: 'start', label: '起始时间（秒）', kind: 'text', placeholder: '0' },
    { key: 'duration', label: '片段时长（秒，最长 30）', kind: 'text', placeholder: '3' },
    { key: 'fps', label: '帧率（1–30）', kind: 'text', placeholder: '10' },
    { key: 'width', label: '输出宽度（像素，64–1280）', kind: 'text', placeholder: '480' },
  ]

  /** 发布结果：GIF 产物 → 对象 URL → 图片预览 */
  function publish(data: Uint8Array<ArrayBufferLike>, fileName: string, report: string): void {
    // ffmpeg readFile 恒返回全新 ArrayBuffer 背包的数组，此处收窄仅为满足 BlobPart 类型
    const url = URL.createObjectURL(
      new Blob([data as Uint8Array<ArrayBuffer>], { type: gifMimeType() }),
    )
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setResult({ fileName, report, bytes: data.length })
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 选择文件：加载 ffmpeg → 写入输入 → 转 GIF → 读取输出 → 发布 */
  async function handleFile(file: File, raw: VideoToGifFormOptions): Promise<void> {
    setError('')
    setPending(true)
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          `文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
        )
      }
      const opts = optionsSchema.parse(raw)
      if (!ffmpegRef.current) ffmpegRef.current = await loadFFmpeg()
      const ffmpeg = ffmpegRef.current
      const inputName = `input-${++ffmpegFileSeq}`
      const outputName = `output-${ffmpegFileSeq}.gif`
      await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))
      const code = await ffmpeg.exec(
        buildGifArgs(inputName, outputName, {
          startSec: opts.start,
          durationSec: opts.duration,
          fps: opts.fps,
          width: opts.width,
        }),
      )
      if (code !== 0) throw new Error(`转换失败：ffmpeg 返回退出码 ${code}`)
      const data = await ffmpeg.readFile(outputName)
      if (typeof data === 'string') throw new Error('转换失败：未能读取输出文件')
      const report = [
        `输入：${file.name}（${formatBytes(file.size)}）`,
        `截取片段：${formatSeconds(opts.start)} 起，时长 ${formatSeconds(opts.duration)}`,
        `帧率：${opts.fps} fps 输出宽度：${opts.width} px`,
        `输出大小：${formatBytes(data.length)}`,
      ].join('\n')
      setSourceName(file.name)
      publish(data, gifFileName(file.name), report)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<VideoToGifInput, VideoToGifFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ start: '0', duration: '3', fps: '10', width: '480' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="video-to-gif-file">
              选择视频文件
            </label>
            <input
              id="video-to-gif-file"
              type="file"
              accept="video/*"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) void handleFile(f, options)
                event.target.value = ''
              }}
            />
            {sourceName ? (
              <span data-testid="file-name" className="text-sm text-slate-600 dark:text-slate-400">
                {sourceName}
              </span>
            ) : null}
          </div>
          {pending ? (
            <p className="text-sm text-slate-500">转换中，ffmpeg 首次加载需要下载 wasm 内核…</p>
          ) : null}
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {result ? (
            <div className="flex flex-col gap-2">
              <img
                src={resultUrl}
                alt="生成的 GIF 动图"
                data-testid="player"
                className="max-w-full rounded border border-slate-200 dark:border-slate-800"
              />
              <p
                data-testid="result-info"
                className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
              >
                {result.report}
              </p>
              <div>
                <a
                  href={resultUrl}
                  download={result.fileName}
                  data-testid="download-image"
                  className={SECONDARY_BUTTON}
                >
                  下载 GIF（{formatBytes(result.bytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择视频文件后自动转换。转换在浏览器本地完成（ffmpeg.wasm），文件不上传；首次使用需从
              CDN 下载 wasm 内核。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
