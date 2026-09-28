import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { AudioVisualizerFormOptions, AudioVisualizerInput } from './schema'
import {
  barWidthFor,
  clampByteValue,
  encodeWavMono,
  indexToHue,
  makeExamplePcm,
  polarPoint,
  smoothValue,
  VISUAL_STYLES,
} from './utils'

const CANVAS_W = 640
const CANVAS_H = 320

export default function Tool() {
  const [styleId, setStyleId] = useState('bars')
  const [hasSource, setHasSource] = useState(false)
  const [fileName, setFileName] = useState('')
  const [paused, setPaused] = useState(true)
  const [error, setError] = useState('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const smoothRef = useRef<number[]>([])
  const pausedRef = useRef(true)

  /** 停止旧声源并释放（换音频 / 卸载时调用） */
  function stopSource(): void {
    try {
      sourceRef.current?.stop()
    } catch {
      /* 未启动的声源 stop 会抛错，忽略 */
    }
    sourceRef.current?.disconnect()
    sourceRef.current = null
    analyserRef.current?.disconnect()
    analyserRef.current = null
  }

  useEffect(() => {
    // 卸载时清理：停掉声源、关闭 AudioContext
    return () => {
      stopSource()
      void audioCtxRef.current?.close().catch(() => undefined)
      audioCtxRef.current = null
    }
  }, [])

  /** 解码音频并接入 AnalyserNode，开始播放 + 可视化 */
  async function setupAudio(buffer: AudioBuffer, name: string): Promise<void> {
    setError('')
    try {
      if (typeof window.AudioContext === 'undefined') {
        throw new Error('当前浏览器不支持 WebAudio，无法播放与分析音频')
      }
      stopSource()
      const ctx = audioCtxRef.current ?? new window.AudioContext()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(analyser)
      analyser.connect(ctx.destination)
      source.start()
      sourceRef.current = source
      analyserRef.current = analyser
      smoothRef.current = []
      if (ctx.state === 'suspended') await ctx.resume()
      setFileName(name)
      setHasSource(true)
      pausedRef.current = false
      setPaused(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '音频初始化失败')
    }
  }

  /** 上传音频文件 → 解码 → 播放 */
  async function handleFile(file: File): Promise<void> {
    setError('')
    try {
      if (typeof window.AudioContext === 'undefined') {
        throw new Error('当前浏览器不支持 WebAudio，无法播放与分析音频')
      }
      const ctx = audioCtxRef.current ?? new window.AudioContext()
      audioCtxRef.current = ctx
      const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
      await setupAudio(buffer, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : '音频解码失败，请换一个音频文件试试')
    }
  }

  /** 示例音频：本地合成 440Hz 正弦 PCM → WAV → 解码播放（不联网） */
  async function loadExample(): Promise<void> {
    setError('')
    try {
      const pcm = makeExamplePcm(8000, 4)
      const wav = encodeWavMono(pcm, 8000)
      const file = new File([wav as unknown as BlobPart], '示例音频.wav', {
        type: 'audio/wav',
      })
      await handleFile(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : '示例音频生成失败')
    }
  }

  /** 暂停 / 继续：停画布循环 + 挂起 / 恢复 AudioContext */
  function togglePause(): void {
    if (!hasSource) return
    if (pausedRef.current) {
      pausedRef.current = false
      setPaused(false)
      void audioCtxRef.current?.resume().catch(() => undefined)
    } else {
      pausedRef.current = true
      setPaused(true)
      void audioCtxRef.current?.suspend().catch(() => undefined)
    }
  }

  /** 画一帧：按当前样式读取 AnalyserNode 数据，用 utils 纯函数做数值映射 */
  function drawFrame(style: string): void {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('当前环境不支持 Canvas 2D 绘图')
      return
    }
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    if (style === 'wave') {
      const data = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(data)
      ctx.beginPath()
      let started = false
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / data.length) * w
        const y = h / 2 + ((clampByteValue(data[i]!) - 128) / 128) * (h / 2 - 8)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.stroke()
      return
    }

    if (style === 'circle') {
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      const count = 96
      const cx = w / 2
      const cy = h / 2
      const baseR = Math.min(w, h) / 4
      ctx.lineWidth = 3
      for (let i = 0; i < count; i++) {
        const idx = Math.floor((i / count) * data.length * 0.7)
        const v = clampByteValue(data[idx]!)
        const prev = smoothRef.current[i] ?? 0
        const len = smoothValue(prev, (v / 255) * baseR, 0.7)
        smoothRef.current[i] = len
        const angle = (i / count) * Math.PI * 2
        const p1 = polarPoint(cx, cy, baseR, angle)
        const p2 = polarPoint(cx, cy, baseR + len, angle)
        ctx.strokeStyle = `hsl(${indexToHue(i, count)}, 80%, 55%)`
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
      return
    }

    // 默认：柱状频谱
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const count = 64
    const gap = 2
    const bw = barWidthFor(w, count, gap)
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / count) * data.length * 0.7)
      const v = clampByteValue(data[idx]!)
      const prev = smoothRef.current[i] ?? 0
      const barH = smoothValue(prev, (v / 255) * h, 0.7)
      smoothRef.current[i] = barH
      ctx.fillStyle = `hsl(${indexToHue(i, count)}, 80%, 50%)`
      ctx.fillRect(i * (bw + gap), h - barH, bw, barH)
    }
  }

  // 播放时逐帧绘制；暂停 / 卸载时取消
  useEffect(() => {
    if (paused || !hasSource) return
    let raf = 0
    const loop = (): void => {
      drawFrame(styleId)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [paused, hasSource, styleId])

  return (
    <MultiPanel<AudioVisualizerInput, AudioVisualizerFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ style: 'bars' }}
      renderOutput={(_input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-400">音频文件</span>
              <input
                type="file"
                accept="audio/*"
                data-testid="audio-input"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                }}
              />
            </label>
            <button
              type="button"
              data-testid="example-audio"
              className={SECONDARY_BUTTON}
              onClick={() => void loadExample()}
            >
              用示例音频
            </button>
            <label className="flex items-center gap-1 text-sm">
              样式
              <select
                data-testid="style-select"
                className="rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                value={styleId}
                onChange={(e) => setStyleId(e.target.value)}
              >
                {VISUAL_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}：{s.description}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              data-testid="play-pause"
              className={SECONDARY_BUTTON}
              disabled={!hasSource}
              onClick={togglePause}
            >
              {paused ? '继续' : '暂停'}
            </button>
          </div>

          {fileName ? (
            <p data-testid="file-name" className="text-xs text-slate-500">
              正在播放：{fileName}
            </p>
          ) : null}

          <canvas
            ref={canvasRef}
            data-testid="visual-canvas"
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full rounded bg-slate-950"
          />

          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}

          {!hasSource && !error ? (
            <p className="text-sm text-slate-500">
              音频在本地解码播放，不上传。注意：浏览器要求用户先点击页面（上传 /
              示例按钮即算），音频才能出声。
            </p>
          ) : null}
        </div>
      )}
      toText={() => (hasSource ? `音频可视化：${fileName}（${styleId}）` : '')}
      downloadExt="txt"
    />
  )
}
