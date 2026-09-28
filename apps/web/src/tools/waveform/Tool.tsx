import { useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { WaveformFormOptions, WaveformInput } from './schema'
import { MAX_ZOOM_FACTOR, computePeaks, formatViewRange, mixToMono, zoomView } from './utils'

/** 单文件上限 200 MiB */
const MAX_FILE_BYTES = 200 * 1024 * 1024
/** 画布尺寸 */
const CANVAS_W = 640
const CANVAS_H = 220

interface WaveData {
  readonly samples: Float32Array
  readonly sampleRate: number
  readonly name: string
}

interface BrowserAudio {
  readonly AudioContext?: new () => AudioContext
  readonly webkitAudioContext?: new () => AudioContext
}

/** 浏览器解码：File → 单声道 PCM（WebAudio 只允许出现在这里） */
async function decodeAudioFile(file: File): Promise<WaveData> {
  const g = globalThis as unknown as BrowserAudio
  const Ctor = g.AudioContext ?? g.webkitAudioContext
  if (!Ctor) throw new Error('当前浏览器不支持 Web Audio API，无法解码音频文件')
  const ctx = new Ctor()
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer())
    const channels: Float32Array[] = []
    for (let c = 0; c < buf.numberOfChannels; c++) channels.push(buf.getChannelData(c).slice())
    return { samples: mixToMono(channels), sampleRate: buf.sampleRate, name: file.name }
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

/** 示例音频：3 秒 440Hz 正弦（直接合成，不走解码） */
function makeExampleData(): WaveData {
  const sampleRate = 44100
  const n = sampleRate * 3
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    // 包络起伏，便于看出波形形状
    const env = 0.6 + 0.4 * Math.sin((2 * Math.PI * 0.5 * i) / sampleRate)
    samples[i] = env * 0.7 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)
  }
  return { samples, sampleRate, name: '示例-440Hz正弦波' }
}

/** 在 canvas 上绘制波形（峰值抽取后按列画竖条） */
function drawWaveform(canvas: HTMLCanvasElement, samples: Float32Array): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D，无法绘制波形')
  const W = canvas.width
  const H = canvas.height
  const mid = H / 2
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, W, H)
  const peaks = computePeaks(samples, W)
  ctx.fillStyle = '#38bdf8'
  for (let i = 0; i < peaks.length; i++) {
    const p = peaks[i]!
    const y1 = mid - p.max * mid
    const y2 = mid - p.min * mid
    ctx.fillRect(i, Math.min(y1, y2), 1, Math.max(1, Math.abs(y2 - y1)))
  }
  // 中线
  ctx.fillStyle = '#475569'
  ctx.fillRect(0, mid, W, 1)
}

export default function Tool() {
  const [wave, setWave] = useState<WaveData | null>(null)
  const [zoomFactor, setZoomFactor] = useState(1)
  const [centerSample, setCenterSample] = useState(0)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /** 当前视图区间（仅用于展示与点击定位） */
  const view = wave ? zoomView(wave.samples.length, centerSample, zoomFactor) : null

  /**
   * 命令式重绘：由用户动作（载入/缩放/定位）直接驱动，不写进 effect
   *（react-hooks/set-state-in-effect：渲染后再同步状态会多一次渲染且来源分散）。
   */
  function redraw(w: WaveData, zoom: number, center: number): void {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const v = zoomView(w.samples.length, center, zoom)
      drawWaveform(canvas, w.samples.subarray(v.start, v.end))
    } catch (err) {
      setError(err instanceof Error ? err.message : '绘制失败')
    }
  }

  function toChineseError(err: unknown): string {
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 选择文件：大小检查 → 解码 → 显示 */
  async function handleFile(file: File): Promise<void> {
    setError('')
    setPending(true)
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('文件过大：超过 200 MiB 上限')
      const data = await decodeAudioFile(file)
      const center = Math.floor(data.samples.length / 2)
      setWave(data)
      setZoomFactor(1)
      setCenterSample(center)
      redraw(data, 1, center)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  function handleExample(): void {
    setError('')
    const data = makeExampleData()
    const center = Math.floor(data.samples.length / 2)
    setWave(data)
    setZoomFactor(1)
    setCenterSample(center)
    redraw(data, 1, center)
  }

  function zoomIn(): void {
    const next = Math.min(MAX_ZOOM_FACTOR, zoomFactor * 2)
    setZoomFactor(next)
    if (wave) redraw(wave, next, centerSample)
  }

  function zoomOut(): void {
    const next = Math.max(1, zoomFactor / 2)
    setZoomFactor(next)
    if (wave) redraw(wave, next, centerSample)
  }

  /** 点击波形：以点击位置为新的缩放中心 */
  function recenter(event: React.MouseEvent<HTMLCanvasElement>): void {
    if (!wave || !view) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5
    const center = Math.round(view.start + ratio * (view.end - view.start))
    setCenterSample(center)
    redraw(wave, zoomFactor, center)
  }

  return (
    <MultiPanel<WaveformInput, WaveformFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="waveform-file">
              选择音频文件
            </label>
            <input
              id="waveform-file"
              type="file"
              accept="audio/*"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) void handleFile(f)
                event.target.value = ''
              }}
            />
            {wave ? (
              <span data-testid="file-name" className="text-sm text-slate-600 dark:text-slate-400">
                {wave.name}
              </span>
            ) : null}
            <button
              type="button"
              data-testid="example-audio"
              className={SECONDARY_BUTTON}
              onClick={handleExample}
            >
              载入示例音频
            </button>
            {wave ? (
              <>
                <button
                  type="button"
                  data-testid="zoom-in"
                  className={SECONDARY_BUTTON}
                  onClick={zoomIn}
                  disabled={zoomFactor >= MAX_ZOOM_FACTOR}
                >
                  放大 ＋
                </button>
                <button
                  type="button"
                  data-testid="zoom-out"
                  className={SECONDARY_BUTTON}
                  onClick={zoomOut}
                  disabled={zoomFactor <= 1}
                >
                  缩小 －
                </button>
                <span
                  data-testid="zoom-label"
                  className="text-sm text-slate-600 dark:text-slate-400"
                >
                  ×{zoomFactor}
                </span>
              </>
            ) : null}
          </div>
          {pending ? <p className="text-sm text-slate-500">解码中…</p> : null}
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
            data-testid="wave-canvas"
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={recenter}
            className="w-full cursor-crosshair rounded border border-slate-200 dark:border-slate-800"
          />
          {wave && view ? (
            <p data-testid="time-info" className="text-sm text-slate-700 dark:text-slate-300">
              显示范围：{formatViewRange(view, wave.sampleRate)}
              （共 {wave.samples.length} 个采样点，{wave.sampleRate} Hz）
            </p>
          ) : (
            !pending &&
            !error && (
              <p className="text-sm text-slate-500">
                选择音频文件或载入示例音频查看波形；放大后点击波形可移动视角。
              </p>
            )
          )}
        </div>
      )}
      toText={() =>
        wave && view ? `波形：${wave.name}，${formatViewRange(view, wave.sampleRate)}` : ''
      }
      downloadExt="txt"
    />
  )
}
