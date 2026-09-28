import { useRef, useState } from 'react'
import { meta } from './meta'
import { TEST_PATTERNS, cyclePattern, getPattern, patternIds, patternStyle } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * 屏幕测试：测试图切换与全屏。Fullscreen API 只允许出现在这里。
 */
export default function Tool() {
  const [current, setCurrent] = useState('red')
  const [isFull, setIsFull] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const ids = patternIds()
  const pattern = getPattern(current)

  function next(): void {
    setCurrent((c) => cyclePattern(ids, c))
  }

  async function toggleFullscreen(): Promise<void> {
    const stage = stageRef.current
    if (!stage) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setIsFull(false)
      } else if (stage.requestFullscreen) {
        await stage.requestFullscreen()
        setIsFull(true)
      }
    } catch {
      setIsFull(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
      <div
        ref={stageRef}
        data-testid="screen-stage"
        data-pattern={current}
        role="button"
        tabIndex={0}
        aria-label={`屏幕测试图：${pattern.name}，回车或空格切换下一张`}
        onClick={next}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            next()
          }
        }}
        className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-slate-300"
        style={patternStyle(current) as React.CSSProperties}
      >
        <span
          data-testid="screen-label"
          className="rounded bg-black/50 px-3 py-1 text-sm text-white"
        >
          {pattern.name}（{pattern.nameEn}）：{pattern.hint}——点击切换
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="screen-next" className={BTN_CLASS} onClick={next}>
          下一张
        </button>
        <button type="button" data-testid="screen-full" className={BTN_CLASS} onClick={toggleFullscreen}>
          {isFull ? '退出全屏' : '全屏测试'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TEST_PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`screen-pattern-${p.id}`}
            className={`${BTN_CLASS} ${p.id === current ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
            onClick={() => setCurrent(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}
