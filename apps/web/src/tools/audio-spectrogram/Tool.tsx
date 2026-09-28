import { useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AudioSpectrogramFormOptions, AudioSpectrogramInput } from './schema'
import {
  computeSpectrogram,
  dbToNorm,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  magnitudeToDb,
  makeSineTone,
  mixDownToMono,
  normToRgb,
  spectrogramFileName,
} from './utils'
import type { PcmAudio, Spectrogram } from './utils'

/** 单文件上限 200 MiB：一次性读进内存解码分析 */
const MAX_FILE_BYTES = 200 * 1024 * 1024
/** 画布最大列数：帧数过多时按列抽稀，避免超大 canvas */
const MAX_CANVAS_COLS = 1600

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly pngBytes: number
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

/**
 * 把语谱图画到 canvas：横轴时间（左→右），纵轴频率（下→上，低频在下）。
 * 纯浏览器绘制逻辑，不进 utils（无需 node 下测试）。
 */
function drawSpectrogram(canvas: HTMLCanvasElement, spec: Spectrogram): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前环境不支持 Canvas 2D，无法绘制频谱图')
  const frames = spec.frames
  const cols = Math.min(frames.length, MAX_CANVAS_COLS)
  const rows = spec.windowSize / 2
  canvas.width = cols
  canvas.height = rows
  let maxMag = 0
  for (const f of frames) {
    for (const m of f) if (m > maxMag) maxMag = m
  }
  if (maxMag <= 0) maxMag = 1
  const img = ctx.createImageData(cols, rows)
  for (let x = 0; x < cols; x++) {
    const f = frames[Math.floor((x * frames.length) / cols)]!
    for (let y = 0; y < rows; y++) {
      const mag = f[rows - 1 - y]!
      const [r, g, b] = normToRgb(dbToNorm(magnitudeToDb(mag, maxMag)))
      const idx = (y * cols + x) * 4
      img.data[idx] = r
      img.data[idx + 1] = g
      img.data[idx + 2] = b
      img.data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

export default function Tool() {
  const [sourceName, setSourceName] = useState('')
  const [decoded, setDecoded] = useState<PcmAudio | null>(null)
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const optionDefs: readonly OptionDef<AudioSpectrogramFormOptions>[] = [
    { key: 'windowSize', label: '窗长（采样点）', kind: 'text', placeholder: '1024' },
    { key: 'overlapPct', label: '重叠率（%）', kind: 'text', placeholder: '50' },
  ]

  /** 发布结果：canvas → PNG dataURL → 图片展示与下载 */
  function publish(
    spec: Spectrogram,
    sampleRate: number,
    name: string,
    opts: { windowSize: number; overlapPct: number },
    audioSec: number,
  ): void {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('频谱图画布尚未就绪，请重试')
    drawSpectrogram(canvas, spec)
    const url = canvas.toDataURL('image/png')
    setResultUrl(url)
    const report = [
      `输入：${name}`,
      `原时长：${formatSeconds(audioSec)} 采样率：${sampleRate} Hz`,
      `窗长：${opts.windowSize} 采样点 重叠率：${opts.overlapPct}% 帧数：${spec.frames.length}`,
      `频率分辨率：${spec.freqStepHz.toFixed(2)} Hz / 频点 时间分辨率：${(spec.frameStepSec * 1000).toFixed(1)} ms / 帧`,
      '颜色越亮表示该时频点能量越强（0 dB 为最亮，-90 dB 以下为底噪）。',
    ].join('\n')
    setResult({
      fileName: spectrogramFileName(name),
      report,
      pngBytes: Math.floor((url.length * 3) / 4),
    })
  }

  /** 纯处理（同步）：参数校验 → STFT → 绘制 → 发布；抛错由调用方统一转中文 */
  function process(audio: PcmAudio, name: string, raw: AudioSpectrogramFormOptions): void {
    const opts = optionsSchema.parse(raw)
    const mono = mixDownToMono(audio)
    const spec = computeSpectrogram(mono, audio.sampleRate, opts.windowSize, opts.overlapPct)
    publish(spec, audio.sampleRate, name, opts, durationSec(audio))
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 选择文件：大小检查 → WebAudio 解码 → 处理 */
  async function handleFile(file: File, raw: AudioSpectrogramFormOptions): Promise<void> {
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
  function handleReprocess(raw: AudioSpectrogramFormOptions): void {
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
    <MultiPanel<AudioSpectrogramInput, AudioSpectrogramFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ windowSize: '1024', overlapPct: '50' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="audio-spectrogram-file">
              选择音频文件
            </label>
            <input
              id="audio-spectrogram-file"
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
          <canvas
            ref={canvasRef}
            data-testid="spectrogram-canvas"
            className={
              result ? 'w-full rounded border border-slate-200 dark:border-slate-800' : 'hidden'
            }
          />
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
                  data-testid="download-image"
                  className={SECONDARY_BUTTON}
                >
                  下载频谱图（约 {formatBytes(result.pngBytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择音频文件或载入示例音频，自动计算语谱图；调整窗长 / 重叠率后可点「重新处理」。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
