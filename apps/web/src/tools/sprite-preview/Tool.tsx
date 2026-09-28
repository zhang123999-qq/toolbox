import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { SpritePreviewToolInput } from './schema'
import { buildPreviewPlayer, colorForSprite } from './utils'
import type { PreviewPlayer } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'w-20 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

function parseFrames(text: string): string[] {
  return text
    .split(/[\n,，]+/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

export default function Tool() {
  const [fps, setFps] = useState('8')
  const [loop, setLoop] = useState(true)
  const [error, setError] = useState('')
  const [player, setPlayer] = useState<PreviewPlayer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [tick, setTick] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)

  function handleBuild(text: string): void {
    setError('')
    try {
      const frames = parseFrames(text)
      const f = Number.parseInt(fps, 10)
      const p = buildPreviewPlayer({ frames, fps: f, loop })
      p.play()
      setPlaying(true)
      setPlayer(p)
      setTick((t) => t + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : '构建失败')
      setPlayer(null)
      setPlaying(false)
    }
  }

  function handleToggle(): void {
    if (!player) return
    player.toggle()
    setPlaying(player.isPlaying())
    setTick((t) => t + 1)
  }

  function handleStep(): void {
    if (!player) return
    const wasPlaying = player.isPlaying()
    player.play()
    player.advance(player.frameDurationMs)
    if (!wasPlaying) player.pause()
    setPlaying(player.isPlaying())
    setTick((t) => t + 1)
  }

  useEffect(() => {
    if (!player || !playing) return
    lastRef.current = performance.now()
    const step = (now: number): void => {
      const dt = now - lastRef.current
      lastRef.current = now
      player.advance(dt)
      setTick((t) => t + 1)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [player, playing])

  useEffect(() => {
    const el = canvasRef.current
    if (!el || !player) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    const idx = player.frameAt(player.cursorMs())
    const id = player.frames[idx]
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, el.width, el.height)
    ctx.fillStyle = colorForSprite(id)
    ctx.fillRect(48, 32, 96, 96)
    ctx.fillStyle = '#0f172a'
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`#${idx} ${id}`, 96, 150)
    ctx.fillText(`${player.cursorMs().toFixed(0)}ms`, 96, 170)
  }, [player, tick])

  const current = player ? player.frameAt(player.cursorMs()) : -1

  return (
    <MultiPanel<SpritePreviewToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'run1\nrun2\nrun3\nrun4' }}
      initialOptions={{}}
      example={{ text: 'run1\nrun2\nrun3\nrun4' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              fps <input data-testid="spritepreview-fps" value={fps} onChange={(e) => setFps(e.target.value)} className={INPUT_CLS} />
            </label>
            <label className="text-xs text-slate-500">
              <input
                type="checkbox"
                data-testid="spritepreview-loop"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
              />{' '}
              循环
            </label>
            <button type="button" data-testid="spritepreview-build" onClick={() => handleBuild(input.text)} className={BTN_CLS}>
              构建预览
            </button>
            <button
              type="button"
              data-testid="spritepreview-toggle"
              disabled={!player}
              onClick={handleToggle}
              className={BTN_CLS}
            >
              {playing ? '暂停' : '播放'}
            </button>
            <button
              type="button"
              data-testid="spritepreview-step"
              disabled={!player}
              onClick={handleStep}
              className={BTN_CLS}
            >
              单步
            </button>
          </div>
          {error !== '' && (
            <p data-testid="spritepreview-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <canvas
            ref={canvasRef}
            data-testid="spritepreview-canvas"
            width={192}
            height={192}
            className="rounded border border-slate-300 dark:border-slate-600"
          />
          <div data-testid="spritepreview-status" className="text-sm">
            {player
              ? `帧 ${current + 1}/${player.frames.length}（#${current} ${player.frames[current]}）· ${player.fps}fps · ${player.loop ? '循环' : '不循环'}`
              : '点击「构建预览」后开始。'}
          </div>
          <pre data-testid="spritepreview-output" className={PRE_CLS}>
            {player ? player.frames.map((f, i) => `#${i} ${f} ${colorForSprite(f)}`).join('\n') : '—'}
          </pre>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入帧的 spriteId 列表（逗号或换行分隔）；播放器为纯逻辑实现，时间由渲染循环传入。
            纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => (player ? `共 ${player.frames.length} 帧，${player.fps}fps` : '未构建')}
    />
  )
}
