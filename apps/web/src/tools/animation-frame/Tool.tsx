import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { AnimationFrameToolInput } from './schema'
import {
  addFrame,
  createClip,
  exportClipJson,
  frameAtTime,
  importClipJson,
  removeFrame,
  reorderFrames,
  totalDuration,
} from './utils'
import type { AnimationClip } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const SMALL_CLS = 'rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

export default function Tool() {
  const [clip, setClip] = useState<AnimationClip>(() => createClip('跑步'))
  const [name, setName] = useState('跑步')
  const [spriteId, setSpriteId] = useState('run1')
  const [duration, setDuration] = useState('100')
  const [loop, setLoop] = useState(true)
  const [time, setTime] = useState('0')
  const [error, setError] = useState('')

  function handleAdd(): void {
    setError('')
    try {
      const d = Number.parseInt(duration, 10)
      setClip(addFrame(clip, { spriteId, durationMs: d }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleImport(text: string): void {
    setError('')
    try {
      const c = importClipJson(text)
      setClip(c)
      setName(c.name)
      setLoop(c.loop)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    }
  }

  const total = totalDuration(clip)
  let current = -1
  try {
    current = frameAtTime(clip, Number.parseInt(time, 10) || 0)
  } catch {
    current = -1
  }

  return (
    <MultiPanel<AnimationFrameToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              片段名{' '}
              <input
                data-testid="animframe-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setClip((c) => ({ ...c, name: e.target.value }))
                }}
                className={`${INPUT_CLS} w-32`}
              />
            </label>
            <label className="text-xs text-slate-500">
              <input
                type="checkbox"
                data-testid="animframe-loop"
                checked={loop}
                onChange={(e) => {
                  setLoop(e.target.checked)
                  setClip((c) => ({ ...c, loop: e.target.checked }))
                }}
              />{' '}
              循环
            </label>
            <label className="text-xs text-slate-500">
              精灵{' '}
              <input
                data-testid="animframe-sprite"
                value={spriteId}
                onChange={(e) => setSpriteId(e.target.value)}
                className={`${INPUT_CLS} w-28`}
              />
            </label>
            <label className="text-xs text-slate-500">
              时长(ms){' '}
              <input
                data-testid="animframe-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={`${INPUT_CLS} w-20`}
              />
            </label>
            <button
              type="button"
              data-testid="animframe-add"
              onClick={handleAdd}
              className={BTN_CLS}
            >
              添加帧
            </button>
            <button
              type="button"
              data-testid="animframe-import"
              onClick={() => handleImport(input.text)}
              disabled={input.text.trim() === ''}
              className={BTN_CLS}
            >
              从输入导入
            </button>
          </div>
          {error !== '' && (
            <p data-testid="animframe-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div data-testid="animframe-list" className="flex flex-col gap-1">
            {clip.frames.map((f, i) => (
              <div key={`${f.spriteId}-${i}`} className="flex items-center gap-2 text-sm">
                <span
                  data-testid={`animframe-frame-${i}`}
                  className={`rounded px-2 py-0.5 font-mono ${i === current ? 'bg-blue-100 font-bold dark:bg-blue-900' : ''}`}
                >
                  #{i} {f.spriteId} · {f.durationMs}ms
                </span>
                <button
                  type="button"
                  data-testid={`animframe-up-${i}`}
                  disabled={i === 0}
                  onClick={() => setClip((c) => reorderFrames(c, i, i - 1))}
                  className={SMALL_CLS}
                >
                  上移
                </button>
                <button
                  type="button"
                  data-testid={`animframe-down-${i}`}
                  disabled={i === clip.frames.length - 1}
                  onClick={() => setClip((c) => reorderFrames(c, i, i + 1))}
                  className={SMALL_CLS}
                >
                  下移
                </button>
                <button
                  type="button"
                  data-testid={`animframe-del-${i}`}
                  onClick={() => setClip((c) => removeFrame(c, i))}
                  className={SMALL_CLS}
                >
                  删除
                </button>
              </div>
            ))}
            {clip.frames.length === 0 && <p className="text-sm text-slate-400">暂无帧，请添加。</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              时间轴(ms){' '}
              <input
                data-testid="animframe-time"
                type="range"
                min="0"
                max={Math.max(total, 1)}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-64"
              />{' '}
              {time}ms
            </label>
            <span data-testid="animframe-current" className="text-sm">
              当前帧：{current >= 0 ? `#${current} ${clip.frames[current].spriteId}` : '—'}
            </span>
            <span data-testid="animframe-total" className="text-sm text-slate-500">
              总时长 {total}ms · {clip.frames.length} 帧 · {loop ? '循环' : '不循环'}
            </span>
          </div>
          <pre data-testid="animframe-output" className={PRE_CLS}>
            {exportClipJson(clip)}
          </pre>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：帧序列不可变操作；循环片段按总时长取模定位当前帧，非循环钳制到末帧。
            纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => exportClipJson(clip)}
    />
  )
}
