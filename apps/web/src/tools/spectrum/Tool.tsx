import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { SpectrumFormOptions, SpectrumInput } from './schema'
import { analyzeSpectrum, dbToUnit, padToLength } from './utils'

/** 单文件上限 200 MiB */
const MAX_FILE_BYTES = 200 * 1024 * 1024
/** 画布尺寸 */
const CANVAS_W = 640
const CANVAS_H = 240
/** 麦克风实时刷新间隔 */
const MIC_POLL_MS = 120

interface PcmAudio {
  readonly sampleRate: number
  readonly channels: readonly Float32Array[]
}

interface BrowserAudio {
  readonly AudioContext?: new () => AudioContext
  readonly webkitAudioContext?: new () => AudioContext
}

/** 浏览器解码：File → PCM（WebAudio 只允许出现在这里） */
async function decodeAudioFile(file: File): Promise<PcmAudio> {
  const g = globalThis as unknown as BrowserAudio
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

/** 立体声混单声道（纯 JS，不依赖浏览器） */
function mixToMono(channels: readonly Float32Array[]): Float32Array {
  const len = channels[0]!.length
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    let s = 0
    for (const ch of channels) s += ch[i]!
    out[i] = s / channels.length
  }
  return out
}

/** 示例音频：440Hz + 880Hz + 1320Hz 混合正弦，3 秒 */
function makeExampleSamples(sampleRate: number): Float32Array {
  const n = sampleRate * 3
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] =
      0.4 * Math.sin((2 * Math.PI * 440 * i) / sampleRate) +
      0.25 * Math.sin((2 * Math.PI * 880 * i) / sampleRate) +
      0.15 * Math.sin((2 * Math.PI * 1320 * i) / sampleRate)
  }
  return out
}

/** 在 canvas 上绘制频谱柱状图（0～1 归一化值） */
function drawBars(canvas: HTMLCanvasElement, values: ArrayLike<number>): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D，无法绘制频谱图')
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, W, H)
  const n = values.length
  const barW = W / n
  for (let i = 0; i < n; i++) {
    const v = Math.min(1, Math.max(0, values[i]!))
    const h = v * H
    ctx.fillStyle = `hsl(${Math.round(220 - v * 220)}, 85%, 55%)`
    ctx.fillRect(i * barW, H - h, Math.max(1, barW - 0.5), h)
  }
}

export default function Tool() {
  const [mode, setMode] = useState<'file' | 'mic'>('file')
  const [fileName, setFileName] = useState('')
  const [peakInfo, setPeakInfo] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const micRef = useRef<{ ctx: AudioContext; stream: MediaStream; timer: number } | null>(null)

  const optionDefs: readonly OptionDef<SpectrumFormOptions>[] = [
    { key: 'fftSize', label: 'FFT 点数', kind: 'text', placeholder: '4096' },
  ]

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  function stopMic(): void {
    const m = micRef.current
    micRef.current = null
    if (m) {
      window.clearTimeout(m.timer)
      for (const track of m.stream.getTracks()) track.stop()
      void m.ctx.close().catch(() => undefined)
    }
  }

  /** 分析 PCM 并绘制：取中段 fftSize 个采样点 */
  function analyzeAndDraw(samples: Float32Array, sampleRate: number, fftSize: number): void {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('画布尚未就绪')
    const slice = padToLength(
      samples.subarray(
        Math.max(0, Math.floor((samples.length - fftSize) / 2)),
        Math.max(0, Math.floor((samples.length - fftSize) / 2)) + fftSize,
      ),
      fftSize,
    )
    const { db, peakFreq, peakDb } = analyzeSpectrum(slice, sampleRate)
    const values = new Float32Array(db.length)
    for (let i = 0; i < db.length; i++) values[i] = dbToUnit(db[i]!)
    drawBars(canvas, values)
    setPeakInfo(`峰值频率：${peakFreq.toFixed(1)} Hz（${peakDb.toFixed(1)} dB）`)
  }

  /** 文件模式：解码 → 分析 → 绘制 */
  async function handleFile(file: File, raw: SpectrumFormOptions): Promise<void> {
    setError('')
    setPending(true)
    try {
      const { fftSize } = optionsSchema.parse(raw)
      if (file.size > MAX_FILE_BYTES) throw new Error(`文件过大：超过 200 MiB 上限`)
      const audio = await decodeAudioFile(file)
      setFileName(file.name)
      analyzeAndDraw(mixToMono(audio.channels), audio.sampleRate, fftSize)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  /** 示例音频：直接合成 PCM，不走解码 */
  function handleExample(raw: SpectrumFormOptions): void {
    setError('')
    try {
      const { fftSize } = optionsSchema.parse(raw)
      setFileName('示例-混合正弦波（440/880/1320Hz）')
      analyzeAndDraw(makeExampleSamples(44100), 44100, fftSize)
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  /** 麦克风模式：AnalyserNode 实时频谱 */
  async function startMic(raw: SpectrumFormOptions): Promise<void> {
    setError('')
    const mediaDevices = globalThis.navigator?.mediaDevices
    if (!mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持麦克风采集（需要 HTTPS 或 localhost 环境）')
      return
    }
    const g = globalThis as unknown as BrowserAudio
    const Ctor = g.AudioContext ?? g.webkitAudioContext
    if (!Ctor) {
      setError('当前浏览器不支持 Web Audio API，无法采集麦克风')
      return
    }
    try {
      const { fftSize } = optionsSchema.parse(raw)
      const stream = await mediaDevices.getUserMedia({ audio: true })
      const ctx = new Ctor()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = fftSize
      source.connect(analyser)
      const bytes = new Uint8Array(analyser.frequencyBinCount)
      const canvas = canvasRef.current
      if (!canvas) throw new Error('画布尚未就绪')
      setFileName('麦克风实时频谱')
      const poll = (): void => {
        analyser.getByteFrequencyData(bytes)
        const values = new Float32Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) values[i] = bytes[i]! / 255
        try {
          drawBars(canvas, values)
        } catch {
          /* 绘制失败则停掉 */
          stopMic()
          return
        }
        const m = micRef.current
        if (m) m.timer = window.setTimeout(poll, MIC_POLL_MS)
      }
      micRef.current = { ctx, stream, timer: window.setTimeout(poll, 0) }
      setPeakInfo('')
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  function switchMode(next: 'file' | 'mic'): void {
    stopMic()
    setMode(next)
    setError('')
    setPeakInfo('')
  }

  // 卸载时释放麦克风
  useEffect(() => {
    return () => {
      const m = micRef.current
      micRef.current = null
      if (m) {
        window.clearTimeout(m.timer)
        for (const track of m.stream.getTracks()) track.stop()
        void m.ctx.close().catch(() => undefined)
      }
    }
  }, [])

  return (
    <MultiPanel<SpectrumInput, SpectrumFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ fftSize: '4096' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="mode-file"
              className={
                mode === 'file'
                  ? 'rounded bg-brand px-3 py-1.5 text-sm text-white'
                  : SECONDARY_BUTTON
              }
              onClick={() => switchMode('file')}
            >
              上传音频
            </button>
            <button
              type="button"
              data-testid="mode-mic"
              className={
                mode === 'mic'
                  ? 'rounded bg-brand px-3 py-1.5 text-sm text-white'
                  : SECONDARY_BUTTON
              }
              onClick={() => switchMode('mic')}
            >
              麦克风实时
            </button>
          </div>
          {mode === 'file' ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className={SECONDARY_BUTTON} htmlFor="spectrum-file">
                选择音频文件
              </label>
              <input
                id="spectrum-file"
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
              {fileName ? (
                <span
                  data-testid="file-name"
                  className="text-sm text-slate-600 dark:text-slate-400"
                >
                  {fileName}
                </span>
              ) : null}
              <button
                type="button"
                data-testid="example-audio"
                className={SECONDARY_BUTTON}
                onClick={() => handleExample(options)}
              >
                载入示例音频
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="mic-start"
                className={SECONDARY_BUTTON}
                onClick={() => void startMic(options)}
              >
                开始采集
              </button>
              <button
                type="button"
                data-testid="mic-stop"
                className={SECONDARY_BUTTON}
                onClick={stopMic}
              >
                停止
              </button>
            </div>
          )}
          {pending ? <p className="text-sm text-slate-500">分析中…</p> : null}
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
            data-testid="spectrum-canvas"
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full rounded border border-slate-200 dark:border-slate-800"
          />
          {peakInfo ? (
            <p data-testid="peak-info" className="text-sm text-slate-700 dark:text-slate-300">
              {peakInfo}
            </p>
          ) : null}
          {!peakInfo && !error && !pending ? (
            <p className="text-sm text-slate-500">
              {mode === 'file'
                ? '选择音频文件或载入示例音频，绘制其频谱图（取音频中段分析）。'
                : '点「开始采集」后对着麦克风发声，实时绘制频谱。'}
            </p>
          ) : null}
        </div>
      )}
      toText={() => peakInfo}
      downloadExt="txt"
    />
  )
}
