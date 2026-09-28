import { useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { SubtitleExtractFormOptions, SubtitleExtractInput } from './schema'
import {
  SUBTITLE_FORMATS,
  SUBTITLE_FORMAT_LABELS,
  SUBTITLE_MIME_TYPES,
  buildExtractArgs,
  formatBytes,
  formatSeconds,
  parseMediaDuration,
  parseSubtitleStreams,
  probeArgs,
  subtitleFileName,
} from './utils'
import type { SubtitleFormat, SubtitleStream } from './utils'

/** 单文件上限 300 MiB：视频文件较大，写进 ffmpeg.wasm 内存文件系统 */
const MAX_FILE_BYTES = 300 * 1024 * 1024

/** ffmpeg.wasm 实例类型（只在 Tool 内使用，不静态引入以免首屏加载 wasm） */
interface FFmpegInstance {
  load: () => Promise<void>
  on: (event: 'log' | 'progress', cb: (e: { message: string }) => void) => void
  writeFile: (path: string, data: Uint8Array) => Promise<boolean>
  exec: (args: string[]) => Promise<number>
  readFile: (path: string) => Promise<Uint8Array | string>
}

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly bytes: number
  readonly mime: string
}

let ffmpegFileSeq = 0

/**
 * 动态加载 ffmpeg.wasm。
 * 必须动态 import（顶层静态引入会拖慢首屏）；加载失败抛中文错，调用方负责展示。
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

/**
 * 示例视频：最小 MP4 ftyp 头（不含字幕流）。
 * 点它会走完整探测流程，最终提示"未检测到字幕流"——这正是无内嵌字幕视频的真实结果；
 * 要体验完整提取请上传带内嵌字幕的 MKV/MP4。
 */
function makeExampleFile(): File {
  const head = new Uint8Array(24)
  const view = new DataView(head.buffer)
  view.setUint32(0, 24, false)
  for (let i = 0; i < 4; i++) view.setUint8(4 + i, 'ftyp'.charCodeAt(i))
  for (let i = 0; i < 4; i++) view.setUint8(8 + i, 'isom'.charCodeAt(i))
  return new File([head], '示例.mp4', { type: 'video/mp4' })
}

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [streams, setStreams] = useState<readonly SubtitleStream[]>([])
  const [selectedSub, setSelectedSub] = useState(0)
  const [duration, setDuration] = useState<number | null>(null)
  const [format, setFormat] = useState<SubtitleFormat>('srt')
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const ffmpegRef = useRef<FFmpegInstance | null>(null)
  const logRef = useRef('')
  const inputNameRef = useRef('')

  /** 发布结果：字幕文本 → 对象 URL → 下载 */
  function publish(
    data: Uint8Array<ArrayBufferLike>,
    fileName: string,
    mime: string,
    report: string,
  ): void {
    const url = URL.createObjectURL(new Blob([data as Uint8Array<ArrayBuffer>], { type: mime }))
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setResult({ fileName, report, bytes: data.length, mime })
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 选择视频：加载 ffmpeg → 写入输入 → 探测字幕流（-i 只列流信息） */
  async function handleFile(file: File): Promise<void> {
    setError('')
    setResult(null)
    setStreams([])
    setPending(true)
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          `文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
        )
      }
      if (!ffmpegRef.current) {
        const ffmpeg = await loadFFmpeg()
        ffmpeg.on('log', ({ message }) => {
          logRef.current += `${message}\n`
        })
        ffmpegRef.current = ffmpeg
      }
      const ffmpeg = ffmpegRef.current
      const inputName = `input-${++ffmpegFileSeq}`
      inputNameRef.current = inputName
      await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))
      logRef.current = ''
      // 探测：ffmpeg -i 无输出文件时会以非 0 退出，这是正常的，流信息在 stderr（log 事件）里
      await ffmpeg.exec(probeArgs(inputName))
      const found = parseSubtitleStreams(logRef.current)
      if (found.length === 0) {
        throw new Error(
          '未检测到字幕流：该视频不含内嵌字幕（烧录在画面里的硬字幕无法提取，请上传带内嵌字幕流的 MKV/MP4）',
        )
      }
      setStreams(found)
      setSelectedSub(0)
      setDuration(parseMediaDuration(logRef.current))
      setSourceName(file.name)
    } catch (err) {
      setError(toChineseError(err))
      setStreams([])
    } finally {
      setPending(false)
    }
  }

  /** 提取选中的字幕流并转码为目标格式 */
  async function handleExtract(): Promise<void> {
    setError('')
    setPending(true)
    try {
      const opts = optionsSchema.parse({ format })
      const stream = streams[selectedSub]
      if (!stream || !ffmpegRef.current) throw new Error('请先选择带字幕流的视频文件')
      const ffmpeg = ffmpegRef.current
      const outputName = `output-${++ffmpegFileSeq}.${opts.format}`
      const code = await ffmpeg.exec(
        buildExtractArgs(inputNameRef.current, stream.subIndex, opts.format, outputName),
      )
      if (code !== 0) throw new Error(`提取失败：ffmpeg 返回退出码 ${code}`)
      const data = await ffmpeg.readFile(outputName)
      if (typeof data === 'string') throw new Error('提取失败：未能读取输出文件')
      const fileName = subtitleFileName(sourceName, stream.subIndex, opts.format)
      const report = [
        `输入：${sourceName}${duration !== null ? `（时长 ${formatSeconds(duration)}）` : ''}`,
        `字幕流：第 ${stream.subIndex + 1} 路（Stream #0:${stream.streamIndex}，编码 ${stream.codec}，语言 ${stream.language}${stream.note ? `，${stream.note}` : ''}）`,
        `输出格式：${SUBTITLE_FORMAT_LABELS[opts.format]} 输出大小：${formatBytes(data.length)}`,
      ].join('\n')
      publish(data, fileName, SUBTITLE_MIME_TYPES[opts.format], report)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<SubtitleExtractInput, SubtitleExtractFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'srt' }}
      optionDefs={[]}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="subtitle-extract-file">
              选择视频文件
            </label>
            <input
              id="subtitle-extract-file"
              type="file"
              accept="video/*,.mkv"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) void handleFile(f)
                event.target.value = ''
              }}
            />
            {sourceName ? (
              <span data-testid="file-name" className="text-sm text-slate-600 dark:text-slate-400">
                {sourceName}
              </span>
            ) : null}
            <button
              type="button"
              data-testid="example-video"
              className={SECONDARY_BUTTON}
              onClick={() => void handleFile(makeExampleFile())}
            >
              载入示例视频
            </button>
            <label className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
              输出字幕格式
              <select
                data-testid="format"
                value={format}
                onChange={(event) => setFormat(event.target.value as SubtitleFormat)}
                className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {SUBTITLE_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {SUBTITLE_FORMAT_LABELS[f]}
                  </option>
                ))}
              </select>
            </label>
            {streams.length > 0 ? (
              <button
                type="button"
                data-testid="extract"
                className={SECONDARY_BUTTON}
                onClick={() => void handleExtract()}
              >
                提取字幕
              </button>
            ) : null}
          </div>
          {streams.length > 0 ? (
            <fieldset className="flex flex-col gap-1">
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
                选择字幕流（共 {streams.length} 路）
              </legend>
              {streams.map((s) => (
                <label
                  key={s.subIndex}
                  className="flex items-center gap-2 rounded border border-slate-200 p-2 text-sm dark:border-slate-700"
                >
                  <input
                    type="radio"
                    name="subtitle-stream"
                    data-testid={`stream-${s.subIndex}`}
                    checked={selectedSub === s.subIndex}
                    onChange={() => setSelectedSub(s.subIndex)}
                  />
                  <span>
                    第 {s.subIndex + 1} 路：编码 {s.codec} 语言 {s.language}
                    {s.note ? ` ${s.note}` : ''}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
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
          {result ? (
            <div className="flex flex-col gap-2">
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
                  data-testid="download-subtitle"
                  className={SECONDARY_BUTTON}
                >
                  下载字幕（{formatBytes(result.bytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !pending && !error && streams.length === 0 ? (
            <p className="text-sm text-slate-500">
              选择视频文件（或载入示例）后自动探测内嵌字幕流，再选择字幕流与输出格式提取。
              提取在浏览器本地完成（ffmpeg.wasm），文件不上传；首次使用需从 CDN 加载 wasm 内核。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
