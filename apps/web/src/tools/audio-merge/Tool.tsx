import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AudioMergeFormOptions, AudioMergeInput } from './schema'
import {
  MERGE_MODES,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  makeSineTone,
  mergeAudios,
  mergeFileName,
  validateMergeInputs,
} from './utils'
import type { PcmAudio } from './utils'

/** 单文件上限 200 MiB：一次性读进内存解码合并 */
const MAX_FILE_BYTES = 200 * 1024 * 1024

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly wavBytes: number
}

interface DecodedTrack {
  readonly name: string
  readonly audio: PcmAudio
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

/** 示例音轨：两段不同频率的正弦波 WAV（utils 纯函数生成，不依赖浏览器解码） */
function makeExampleFiles(): File[] {
  const a = encodeWavPcm(makeSineTone(44100, 2, 440))
  const b = encodeWavPcm(makeSineTone(44100, 3, 330))
  return [
    new File([a], '示例-音轨1-440Hz.wav', { type: 'audio/wav' }),
    new File([b], '示例-音轨2-330Hz.wav', { type: 'audio/wav' }),
  ]
}

export default function Tool() {
  const [tracks, setTracks] = useState<DecodedTrack[]>([])
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const optionDefs: readonly OptionDef<AudioMergeFormOptions>[] = [
    { key: 'mode', label: '合并模式', kind: 'select', values: [...MERGE_MODES] },
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

  /** 纯处理（同步）：校验 → 合并 → 发布；抛错由调用方统一转中文 */
  function process(all: DecodedTrack[], raw: AudioMergeFormOptions): void {
    const opts = optionsSchema.parse(raw)
    const audios = all.map((t) => t.audio)
    validateMergeInputs(audios)
    const out = mergeAudios(audios, opts.mode)
    const modeText = opts.mode === 'concat' ? '首尾拼接' : '混音叠加'
    const report = [
      `输入：${all.map((t) => t.name).join('、')}（共 ${all.length} 轨）`,
      ...all.map(
        (t, i) =>
          `音轨 ${i + 1}：${formatSeconds(durationSec(t.audio))} 采样率：${t.audio.sampleRate} Hz 声道：${t.audio.channels.length}`,
      ),
      `合并模式：${modeText}`,
      `输出时长：${formatSeconds(durationSec(out))}`,
    ].join('\n')
    publish(out, mergeFileName(opts.mode, all.length), report)
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 选择文件（可多选）：大小检查 → 逐个 WebAudio 解码 → 合并 */
  async function handleFiles(files: File[], raw: AudioMergeFormOptions): Promise<void> {
    setError('')
    setPending(true)
    try {
      if (files.length === 0) throw new Error('请至少选择 2 个音频文件')
      for (const f of files) {
        if (f.size > MAX_FILE_BYTES) {
          throw new Error(
            `文件过大：${f.name}（${formatBytes(f.size)}），超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
          )
        }
      }
      const decodedTracks: DecodedTrack[] = []
      for (const f of files) {
        decodedTracks.push({ name: f.name, audio: await decodeAudioFile(f) })
      }
      setTracks(decodedTracks)
      process(decodedTracks, raw)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  /** 修改参数后重新处理（复用已解码的 PCM，不必重新选文件） */
  function handleReprocess(raw: AudioMergeFormOptions): void {
    if (tracks.length === 0) {
      setError('请先选择至少 2 个音频文件')
      return
    }
    setError('')
    setPending(true)
    try {
      process(tracks, raw)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AudioMergeInput, AudioMergeFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'concat' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="audio-merge-file">
              选择音频文件（可多选）
            </label>
            <input
              id="audio-merge-file"
              type="file"
              accept="audio/*"
              multiple
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const fs = Array.from(event.target.files ?? [])
                if (fs.length > 0) void handleFiles(fs, options)
                event.target.value = ''
              }}
            />
            {tracks.length > 0 ? (
              <span data-testid="file-name" className="text-sm text-slate-600 dark:text-slate-400">
                已载入 {tracks.length} 轨：{tracks.map((t) => t.name).join('、')}
              </span>
            ) : null}
            <button
              type="button"
              data-testid="example-audio"
              className={SECONDARY_BUTTON}
              onClick={() => void handleFiles(makeExampleFiles(), options)}
            >
              载入示例音频
            </button>
            {tracks.length > 0 ? (
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
              选择至少 2
              个音频文件（可多选）后自动合并；修改模式后可点「重新处理」。拼接模式把音轨首尾相接，混音模式把音轨叠加（按最长对齐）。各音轨采样率与声道数须一致。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
