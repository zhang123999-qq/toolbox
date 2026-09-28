import { useRef, useState } from 'react'

/** ffmpeg 虚拟文件序号（模块级，避免 react-hooks/purity 误报） */
let ffmpegFileSeq = 0
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AudioExtractFormOptions, AudioExtractInput } from './schema'
import {
  EXTRACT_FORMATS,
  buildExtractArgs,
  encodeWavPcm,
  extractFileName,
  extractMimeType,
  formatBytes,
  makeSineTone,
} from './utils'
import type { ExtractFormat } from './utils'

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
  readonly mime: string
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

/**
 * 示例视频替代品：用纯函数生成一段"带静音视频感"的 WAV 当示例输入。
 * 注意：示例只是演示流程的音频文件，真实场景请上传 mp4 / webm 等视频。
 */
function makeExampleFile(): File {
  const wav = encodeWavPcm(makeSineTone(44100, 4, 440))
  return new File([wav], '示例-440Hz正弦波.wav', { type: 'audio/wav' })
}

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const ffmpegRef = useRef<FFmpegInstance | null>(null)

  const optionDefs: readonly OptionDef<AudioExtractFormOptions>[] = [
    { key: 'format', label: '输出音频格式', kind: 'select', values: [...EXTRACT_FORMATS] },
  ]

  /** 发布结果：提取出的音频 → 对象 URL → 播放器 */
  function publish(
    data: Uint8Array<ArrayBufferLike>,
    fileName: string,
    mime: string,
    report: string,
  ): void {
    // ffmpeg readFile 恒返回全新 ArrayBuffer 背包的数组，此处收窄仅为满足 BlobPart 类型
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

  /** 选择视频：加载 ffmpeg → 写入输入 → 提取音轨（-vn）→ 读取输出 → 发布 */
  async function handleFile(file: File, raw: AudioExtractFormOptions): Promise<void> {
    setError('')
    setPending(true)
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          `文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
        )
      }
      const opts = optionsSchema.parse(raw)
      const format: ExtractFormat = opts.format
      if (!ffmpegRef.current) ffmpegRef.current = await loadFFmpeg()
      const ffmpeg = ffmpegRef.current
      const inputName = `input-${++ffmpegFileSeq}`
      const outputName = `output-${ffmpegFileSeq}.${format}`
      await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))
      const code = await ffmpeg.exec(buildExtractArgs(inputName, outputName, format))
      if (code !== 0) throw new Error(`提取失败：ffmpeg 返回退出码 ${code}`)
      const data = await ffmpeg.readFile(outputName)
      if (typeof data === 'string') throw new Error('提取失败：未能读取输出文件')
      const mime = extractMimeType(format)
      const report = [
        `输入：${file.name}（${formatBytes(file.size)}）`,
        `提取方式：去掉视频流（-vn），只保留音轨`,
        `输出格式：${format.toUpperCase()} 输出大小：${formatBytes(data.length)}`,
      ].join('\n')
      setSourceName(file.name)
      publish(data, extractFileName(file.name, format), mime, report)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AudioExtractInput, AudioExtractFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'mp3' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="audio-extract-file">
              选择视频文件
            </label>
            <input
              id="audio-extract-file"
              type="file"
              accept="video/*,audio/*"
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
            <button
              type="button"
              data-testid="example-audio"
              className={SECONDARY_BUTTON}
              onClick={() => void handleFile(makeExampleFile(), options)}
            >
              载入示例音频
            </button>
          </div>
          {pending ? (
            <p className="text-sm text-slate-500">提取中，ffmpeg 首次加载需要下载 wasm 内核…</p>
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
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 用户上传/生成的音频没有字幕轨道 */}
              <audio controls src={resultUrl} data-testid="player" className="w-full" />
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
                  data-testid="download-audio"
                  className={SECONDARY_BUTTON}
                >
                  下载音频（{formatBytes(result.bytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择视频文件（mp4 / webm / mkv
              等）后自动提取音轨。提取在浏览器本地完成（ffmpeg.wasm），文件不上传；首次使用需从 CDN
              下载 wasm 内核。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
