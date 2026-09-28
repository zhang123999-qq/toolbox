import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AudioMixFormOptions, AudioMixInput } from './schema'
import {
  ALIGN_MODES,
  ALIGN_MODE_LABELS,
  MAX_TRACKS,
  assertValidVolume,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  makeSineTone,
  mixAudios,
  mixFileName,
} from './utils'
import type { AlignMode, MixTrack, PcmAudio } from './utils'

/** 单文件上限 200 MiB：一次性读进内存解码加混音 */
const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 一路音轨：组件列表状态（id 稳定供 key / data-testid 用） */
interface TrackItem {
  readonly id: number
  readonly name: string
  readonly audio: PcmAudio
  volume: string
}

interface DoneResult {
  readonly report: string
  readonly wavBytes: number
}

let nextTrackId = 1

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

/** 示例音轨：440Hz + 660Hz 各 3 秒正弦波，音量配比 100% / 50% */
function makeExampleTracks(): TrackItem[] {
  // 用 utils 纯函数生成 WAV 再解回 PCM：复用同一份正弦波逻辑，不依赖浏览器解码
  const mk = (freqHz: number, name: string, volume: string): TrackItem => {
    const wav = encodeWavPcm(makeSineTone(44100, 3, freqHz))
    const view = new DataView(wav.buffer)
    const frames = (wav.length - 44) / 2
    const data = new Float32Array(frames)
    for (let i = 0; i < frames; i++) data[i] = view.getInt16(44 + i * 2, true) / 32768
    return {
      id: nextTrackId++,
      name,
      audio: { sampleRate: 44100, channels: [data] },
      volume,
    }
  }
  return [mk(440, '示例-440Hz.wav', '1'), mk(660, '示例-660Hz.wav', '0.5')]
}

export default function Tool() {
  const [tracks, setTracks] = useState<readonly TrackItem[]>([])
  const [align, setAlign] = useState<AlignMode>('shortest')
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  /** 发布结果：编码 WAV → 对象 URL → 播放器 */
  function publish(audio: PcmAudio, report: string): void {
    const wav = encodeWavPcm(audio)
    const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setResult({ report, wavBytes: wav.length })
  }

  /** 混音（同步）：音量解析 → 混音 → 发布；抛错由调用方统一转中文 */
  function process(all: readonly TrackItem[], mode: AlignMode): void {
    const opts = optionsSchema.parse({ align: mode })
    const mixTracks: MixTrack[] = all.map((t) => {
      const v = Number(t.volume)
      assertValidVolume(v)
      return { audio: t.audio, volume: v }
    })
    const out = mixAudios(mixTracks, opts.align)
    const lines = all.map((t, i) => `音轨 ${i + 1}：${t.name}（音量 ${Number(t.volume) * 100}%）`)
    const report = [
      ...lines,
      `对齐方式：${ALIGN_MODE_LABELS[opts.align]}`,
      `输出：${formatSeconds(durationSec(out))} 采样率：${out.sampleRate} Hz 声道：${out.channels.length}`,
    ].join('\n')
    publish(out, report)
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 新增音轨：大小检查 → WebAudio 解码；达到 2 路自动混音 */
  async function handleFiles(files: FileList | null, mode: AlignMode): Promise<void> {
    setError('')
    setPending(true)
    try {
      const list = files ? Array.from(files) : []
      if (tracks.length + list.length > MAX_TRACKS) {
        throw new Error(`音轨过多：最多 ${MAX_TRACKS} 路`)
      }
      const added: TrackItem[] = []
      for (const file of list) {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            `文件过大：${formatBytes(file.size)}，超过 ${formatBytes(MAX_FILE_BYTES)} 上限`,
          )
        }
        added.push({
          id: nextTrackId++,
          name: file.name,
          audio: await decodeAudioFile(file),
          volume: '1',
        })
      }
      const all = [...tracks, ...added]
      setTracks(all)
      if (all.length >= 2) process(all, mode)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  /** 修改音量 / 对齐后重新混音 */
  function handleRemix(all: readonly TrackItem[], mode: AlignMode): void {
    setError('')
    setPending(true)
    try {
      process(all, mode)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  function updateVolume(id: number, volume: string): void {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, volume } : t)))
  }

  function removeTrack(id: number): void {
    const all = tracks.filter((t) => t.id !== id)
    setTracks(all)
    setResult(null)
    setError('')
  }

  function loadExample(): void {
    const all = makeExampleTracks()
    setTracks(all)
    setError('')
    setPending(true)
    try {
      process(all, align)
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AudioMixInput, AudioMixFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ align: 'shortest' }}
      optionDefs={[]}
      example={{ text: '' }}
      renderOutput={(_input) => {
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className={SECONDARY_BUTTON} htmlFor="audio-mix-files">
                添加音频文件
              </label>
              <input
                id="audio-mix-files"
                type="file"
                accept="audio/*"
                multiple
                data-testid="files"
                className="hidden"
                onChange={(event) => {
                  void handleFiles(event.target.files, align)
                  event.target.value = ''
                }}
              />
              <button
                type="button"
                data-testid="example-audio"
                className={SECONDARY_BUTTON}
                onClick={loadExample}
              >
                载入示例音轨
              </button>
              <label className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                时长对齐
                <select
                  data-testid="align"
                  value={align}
                  onChange={(event) => setAlign(event.target.value as AlignMode)}
                  className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {ALIGN_MODES.map((m) => (
                    <option key={m} value={m}>
                      {ALIGN_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
              {tracks.length >= 2 ? (
                <button
                  type="button"
                  data-testid="remix"
                  className={SECONDARY_BUTTON}
                  onClick={() => handleRemix(tracks, align)}
                >
                  重新混音
                </button>
              ) : null}
            </div>
            {tracks.length > 0 ? (
              <ul className="flex flex-col gap-1" data-testid="track-list">
                {tracks.map((t, i) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-2 text-sm dark:border-slate-700"
                  >
                    <span className="font-medium">音轨 {i + 1}</span>
                    <span
                      data-testid={`track-name-${t.id}`}
                      className="text-slate-600 dark:text-slate-400"
                    >
                      {t.name}
                    </span>
                    <span className="text-slate-500">{formatSeconds(durationSec(t.audio))}</span>
                    <label className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      音量（倍数）
                      <input
                        type="text"
                        inputMode="decimal"
                        data-testid={`volume-${t.id}`}
                        value={t.volume}
                        onChange={(event) => updateVolume(t.id, event.target.value)}
                        className="w-16 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <button
                      type="button"
                      data-testid={`remove-track-${t.id}`}
                      className={SECONDARY_BUTTON}
                      onClick={() => removeTrack(t.id)}
                    >
                      移除
                    </button>
                  </li>
                ))}
              </ul>
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
                    download={mixFileName()}
                    data-testid="download-audio"
                    className={SECONDARY_BUTTON}
                  >
                    下载混音（{formatBytes(result.wavBytes)}）
                  </a>
                </div>
              </div>
            ) : null}
            {!result && !pending && !error ? (
              <p className="text-sm text-slate-500">
                添加至少 2 路音频文件（或载入示例音轨）即自动混音；调整音量 /
                对齐方式后点「重新混音」。
              </p>
            ) : null}
          </div>
        )
      }}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
