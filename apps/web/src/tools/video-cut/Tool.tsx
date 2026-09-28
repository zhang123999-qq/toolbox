import { useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { VideoCutFormOptions, VideoCutInput } from './schema'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import {
  buildCutArgs,
  cutFileName,
  formatBytes,
  formatSeconds,
  formatTimeForFfmpeg,
  parseTimeInput,
  validateCutRange,
} from './utils'

/** 单文件上限 500 MiB：写进 ffmpeg.wasm 内存文件系统 */
const MAX_FILE_BYTES = 500 * 1024 * 1024

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly bytes: number
}

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [phase, setPhase] = useState('')
  const probeRef = useRef<HTMLVideoElement | null>(null)

  const optionDefs: readonly OptionDef<VideoCutFormOptions>[] = [
    { key: 'start', label: '起始时间（秒 / 分:秒）', kind: 'text', placeholder: '1.0' },
    { key: 'end', label: '结束时间（秒 / 分:秒）', kind: 'text', placeholder: '2.0' },
    { key: 'reencode', label: '重编码输出（H.264+AAC，兼容性更好）', kind: 'boolean' },
  ]

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 隐形 video 元素探测时长（不插入 DOM，不影响布局） */
  function probeDuration(file: File): void {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    probeRef.current?.removeAttribute('src')
    probeRef.current = video
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration)
      URL.revokeObjectURL(url)
    }
    video.onerror = () => URL.revokeObjectURL(url)
    video.src = url
  }

  /** 选择文件：大小检查 → 探测时长（实际裁剪点「开始裁剪」按钮） */
  function handleFile(file: File): void {
    setError('')
    setResult(null)
    if (file.size > MAX_FILE_BYTES) {
      setError(`文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`)
      return
    }
    setSourceName(file.name)
    setDuration(null)
    probeDuration(file)
  }

  /** 开始裁剪：参数校验 → 动态加载 ffmpeg → 转码 → 发布 */
  async function handleCut(raw: VideoCutFormOptions): Promise<void> {
    if (!sourceName) {
      setError('请先选择视频文件')
      return
    }
    setError('')
    setResult(null)
    setPending(true)
    try {
      const opts = optionsSchema.parse(raw)
      const start = parseTimeInput(opts.start)
      const end = parseTimeInput(opts.end)
      validateCutRange(start, end, duration)
      const inputFile = await pickFileAgain()
      setPhase('正在加载视频编码组件…')
      let FFmpegCtor: typeof FFmpeg
      try {
        const mod = await import('@ffmpeg/ffmpeg')
        FFmpegCtor = mod.FFmpeg
      } catch {
        throw new Error('视频编码组件加载失败，请检查网络后重试')
      }
      const ffmpeg = new FFmpegCtor()
      try {
        await ffmpeg.load()
      } catch {
        throw new Error('视频编码组件初始化失败，请检查网络后重试')
      }
      const inName = 'input-src'
      const outName = 'output-cut.mp4'
      setPhase('正在写入输入文件…')
      await ffmpeg.writeFile(inName, new Uint8Array(await inputFile.arrayBuffer()))
      setPhase('正在裁剪视频…')
      const args = buildCutArgs(
        formatTimeForFfmpeg(start),
        formatTimeForFfmpeg(end),
        inName,
        outName,
        raw.reencode,
      )
      const code = await ffmpeg.exec(args)
      if (code !== 0) throw new Error(`视频裁剪失败（退出码 ${code}），请换用重编码模式重试`)
      const fileData = await ffmpeg.readFile(outName)
      if (typeof fileData === 'string') throw new Error('读取输出文件失败：数据类型异常')
      const data = Uint8Array.from(fileData)
      await ffmpeg.deleteFile(inName).catch(() => undefined)
      await ffmpeg.deleteFile(outName).catch(() => undefined)
      const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }))
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      const report = [
        `输入：${sourceName}`,
        duration !== null ? `原时长：${formatSeconds(duration)}` : '原时长：未知',
        `裁剪区间：${formatSeconds(start)} – ${formatSeconds(end)}`,
        `模式：${raw.reencode ? '重编码（H.264 + AAC）' : '流拷贝（不重编码）'}`,
        `输出：${cutFileName(sourceName)}（${formatBytes(data.length)}）`,
      ].join('\n')
      setResult({ fileName: cutFileName(sourceName), report, bytes: data.length })
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
      setPhase('')
    }
  }

  /** 让用户无需重新选文件也能再次裁剪：从 input 元素取回上次的文件 */
  function pickFileAgain(): Promise<File> {
    const input = document.getElementById('video-cut-file') as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) throw new Error('找不到已选择的视频文件，请重新选择')
    return Promise.resolve(file)
  }

  return (
    <MultiPanel<VideoCutInput, VideoCutFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ start: '1.0', end: '2.0', reencode: true }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="video-cut-file">
              选择视频文件
            </label>
            <input
              id="video-cut-file"
              type="file"
              accept="video/*"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {sourceName ? (
              <span data-testid="file-name" className="text-sm text-slate-600 dark:text-slate-400">
                {sourceName}
                {duration !== null ? `（${formatSeconds(duration)}）` : ''}
              </span>
            ) : null}
            <button
              type="button"
              data-testid="cut"
              className={SECONDARY_BUTTON}
              disabled={pending}
              onClick={() => void handleCut(options)}
            >
              {pending ? '处理中…' : '开始裁剪'}
            </button>
          </div>
          {pending && phase ? <p className="text-sm text-slate-500">{phase}</p> : null}
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
              <video controls src={resultUrl} data-testid="player" className="w-full">
                <track kind="captions" />
              </video>
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
                  data-testid="download-video"
                  className={SECONDARY_BUTTON}
                >
                  下载视频（{formatBytes(result.bytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择视频文件后设置起止时间（支持「83.5」「1:23.5」「1:02:03」写法），点「开始裁剪」导出
              MP4 片段。全程本地处理，不上传文件。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
