import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AudioSpeedFormOptions, AudioSpeedInput } from './schema'
import {
  changeSpeed,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  makeSineTone,
  speedFileName,
} from './utils'
import type { PcmAudio } from './utils'

/** 单文件上限 200 MiB：一次性读进内存解码变速 */
const MAX_FILE_BYTES = 200 * 1024 * 1024

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly wavBytes: number
}

/**
 * 浏览器解码：File → PCM。
 * WebAudio 只允许出现在这里，utils 保持纯函数、可在 node 下测试。
 */
async function decodeAudioFile(file: File): Promise<PcmAudio> {
  const g = globalThis as unknown as {
    AudioContext?: new () => AudioContext
    webkitAudioContext?: new () => AudioContext
  }
  const Ctor = g.AudioContext ?? g.webkitAudioContext
  if (!Ctor) throw new Error('当前浏览器不支持 Web Audio API，无法解码音频文件')
  const ctx = new Ctor()
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer())
    const channels: Float32Array[] = []
    for (let c = 0; c < buf.numberOfChannels; c++) channels.push(buf.getChannelData(c).slice())
    return { sampleRate: buf.sampleRate, channels }
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

/** 示例音频：4 秒 440Hz 正弦波 WAV（utils 纯函数生成，不依赖浏览器解码） */
function makeExampleFile(): File {
  const wav = encodeWavPcm(makeSineTone(44100, 4, 440))
  return new File([wav], '示例-440Hz正弦波.wav', { type: 'audio/wav' })
}

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [decoded, setDecoded] = useState<PcmAudio | null>(null)
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const optionDefs: readonly OptionDef<AudioSpeedFormOptions>[] = [
    { key: 'rate', label: '变速倍率（0.25～4）', kind: 'text', placeholder: '1.5' },
  ]

  /** 发布结果：编码 WAV → 对象 URL → 播放器 */
  function publish(audio: PcmAudio, fileName: string, report: string): void {
    const wav = encodeWavPcm(audio)
    const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setResult({ fileName, report, wavBytes: wav.length })
  }

  /** 纯处理（同步）：参数校验 → 变速 → 发布；抛错由调用方统一转中文 */
  function process(audio: PcmAudio, name: string, raw: AudioSpeedFormOptions): void {
    const opts = optionsSchema.parse(raw)
    const out = changeSpeed(audio, opts.rate)
    const report = [
      `输入：${name}`,
      `原时长：${formatSeconds(durationSec(audio))} 采样率：${audio.sampleRate} Hz 声道：${audio.channels.length}`,
      `变速倍率：${opts.rate}x`,
      `输出时长：${formatSeconds(durationSec(out))}`,
    ].join('\n')
    publish(out, speedFileName(name, opts.rate), report)
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 选择文件：大小检查 → WebAudio 解码 → 处理 */
  async function handleFile(file: File, raw: AudioSpeedFormOptions): Promise<void> {
    setError('')
    setPending(true)
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          `文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
        )
      }
      const audio = await decodeAudioFile(file)
      setDecoded(audio)
      setSourceName(file.name)
      process(audio, file.name, raw)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  /** 修改参数后重新处理（复用已解码的 PCM，不必重新选文件） */
  function handleReprocess(raw: AudioSpeedFormOptions): void {
    if (!decoded) {
      setError('请先选择音频文件')
      return
    }
    setError('')
    setPending(true)
    try {
      process(decoded, sourceName, raw)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AudioSpeedInput, AudioSpeedFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ rate: '1.5' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="audio-speed-file">
              选择音频文件
            </label>
            <input
              id="audio-speed-file"
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
            {decoded ? (
              <button
                type="button"
                data-testid="reprocess"
                className={SECONDARY_BUTTON}
                onClick={() => handleReprocess(options)}
              >
                重新处理
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
                  下载音频（{formatBytes(result.wavBytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择音频文件或载入示例音频，设置倍率后自动变速；修改参数后可点「重新处理」。注意：本工具用线性插值重采样实现，变速会同时改变音调。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
