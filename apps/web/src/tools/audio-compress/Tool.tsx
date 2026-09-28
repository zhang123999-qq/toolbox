import { useRef, useState } from 'react'

/** ffmpeg 虚拟文件序号（模块级，避免 react-hooks/purity 误报） */
let ffmpegFileSeq = 0
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AudioCompressFormOptions, AudioCompressInput } from './schema'
import {
  COMPRESS_PRESETS,
  buildCompressArgs,
  compressFileName,
  encodeWavPcm,
  formatBytes,
  makeSineTone,
  presetKbps,
  validateCompressBitrate,
} from './utils'

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

/** 示例音频：4 秒 440Hz 正弦波 WAV（utils 纯函数生成） */
function makeExampleFile(): File {
  const wav = encodeWavPcm(makeSineTone(44100, 4, 440))
  return new File([wav], '示例-440Hz正弦波.wav', { type: 'audio/wav' })
}

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [sourceBytes, setSourceBytes] = useState(0)
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const ffmpegRef = useRef<FFmpegInstance | null>(null)

  const optionDefs: readonly OptionDef<AudioCompressFormOptions>[] = [
    {
      key: 'preset',
      label: '压缩预设',
      kind: 'select',
      values: COMPRESS_PRESETS.map((p) => p.id),
    },
    {
      key: 'bitrateKbps',
      label: '自定义比特率（kbps，留空用预设）',
      kind: 'text',
      placeholder: '留空',
    },
  ]

  /** 发布结果：压缩产物 → 对象 URL → 播放器 */
  function publish(data: Uint8Array<ArrayBufferLike>, fileName: string, report: string): void {
    // ffmpeg readFile 恒返回全新 ArrayBuffer 背包的数组，此处收窄仅为满足 BlobPart 类型
    const url = URL.createObjectURL(
      new Blob([data as Uint8Array<ArrayBuffer>], { type: 'audio/mpeg' }),
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

  /** 解析目标比特率：填了自定义值就用它，否则用预设值 */
  function resolveKbps(raw: AudioCompressFormOptions): number {
    const opts = optionsSchema.parse(raw)
    const custom = opts.bitrateKbps.trim()
    if (custom === '') return presetKbps(opts.preset)
    const n = Number(custom)
    if (!Number.isFinite(n)) throw new Error('自定义比特率必须是数字')
    validateCompressBitrate(n)
    return n
  }

  /** 选择文件：加载 ffmpeg → 写入输入 → 压缩 → 读取输出 → 发布 */
  async function handleFile(file: File, raw: AudioCompressFormOptions): Promise<void> {
    setError('')
    setPending(true)
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          `文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
        )
      }
      const kbps = resolveKbps(raw)
      if (!ffmpegRef.current) ffmpegRef.current = await loadFFmpeg()
      const ffmpeg = ffmpegRef.current
      const inputName = `input-${++ffmpegFileSeq}`
      const outputName = `output-${ffmpegFileSeq}.mp3`
      await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))
      const code = await ffmpeg.exec(buildCompressArgs(inputName, outputName, kbps))
      if (code !== 0) throw new Error(`压缩失败：ffmpeg 返回退出码 ${code}`)
      const data = await ffmpeg.readFile(outputName)
      if (typeof data === 'string') throw new Error('压缩失败：未能读取输出文件')
      const preset = COMPRESS_PRESETS.find((p) => p.id === optionsSchema.parse(raw).preset)
      const report = [
        `输入：${file.name}（${formatBytes(file.size)}）`,
        `压缩配置：${preset?.label ?? ''}${raw.bitrateKbps.trim() === '' ? '' : '（自定义比特率覆盖）'}`,
        `输出大小：${formatBytes(data.length)} 压缩比：${((data.length / file.size) * 100).toFixed(1)}%`,
      ].join('\n')
      setSourceName(file.name)
      setSourceBytes(file.size)
      publish(data, compressFileName(file.name, kbps), report)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AudioCompressInput, AudioCompressFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ preset: 'medium', bitrateKbps: '' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="audio-compress-file">
              选择音频文件
            </label>
            <input
              id="audio-compress-file"
              type="file"
              accept="audio/*"
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
                {sourceName}（{formatBytes(sourceBytes)}）
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
            <p className="text-sm text-slate-500">压缩中，ffmpeg 首次加载需要下载 wasm 内核…</p>
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
              选择音频文件后自动压缩为
              MP3。压缩在浏览器本地完成（ffmpeg.wasm），文件不上传；首次使用需从 CDN 下载 wasm
              内核。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
