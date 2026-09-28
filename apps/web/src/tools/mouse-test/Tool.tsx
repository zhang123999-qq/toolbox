import { useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import type { ClickRecord } from './utils'
import { formatClickRecord, trackClicks, wheelDeltaText } from './utils'

const PANEL_CLASS =
  'rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'
const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * 鼠标测试：监听测试区 mousedown / wheel，记录点击与滚轮方向。
 * DOM 事件监听只允许出现在这里。
 */
export default function Tool() {
  const [clicks, setClicks] = useState<readonly ClickRecord[]>([])
  const [lastAction, setLastAction] = useState('在下方测试区点击或滚动鼠标')
  const [doubleCount, setDoubleCount] = useState(0)
  const zoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone) return

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      setClicks((prev) => {
        const r = trackClicks(prev, e, Date.now())
        setLastAction(
          r.isDouble
            ? `双击：${formatClickRecord(r.clicks[r.clicks.length - 1]!)}`
            : `单击：${formatClickRecord(r.clicks[r.clicks.length - 1]!)}`,
        )
        if (r.isDouble) setDoubleCount((c) => c + 1)
        return r.clicks
      })
    }
    function onWheel(e: WheelEvent): void {
      e.preventDefault()
      setLastAction(`滚轮：${wheelDeltaText(e.deltaY)}（deltaY=${Math.round(e.deltaY)}）`)
    }
    function onContextMenu(e: MouseEvent): void {
      e.preventDefault()
    }
    zone.addEventListener('mousedown', onMouseDown)
    zone.addEventListener('wheel', onWheel, { passive: false })
    zone.addEventListener('contextmenu', onContextMenu)
    return () => {
      zone.removeEventListener('mousedown', onMouseDown)
      zone.removeEventListener('wheel', onWheel)
      zone.removeEventListener('contextmenu', onContextMenu)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
      <div
        ref={zoneRef}
        data-testid="mouse-zone"
        className={`${PANEL_CLASS} flex min-h-40 cursor-crosshair select-none items-center justify-center`}
      >
        <p data-testid="mouse-last" className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {lastAction}
        </p>
      </div>
      <div className={PANEL_CLASS}>
        <p data-testid="mouse-summary" className="mb-2 text-sm text-slate-500 dark:text-slate-400">
          点击记录（{clicks.length} 次，双击 {doubleCount} 次）：
        </p>
        <ul data-testid="mouse-history" className="max-h-40 space-y-1 overflow-auto text-sm text-slate-700 dark:text-slate-300">
          {clicks.length === 0 ? (
            <li>（暂无）</li>
          ) : (
            [...clicks].reverse().map((c, i) => <li key={clicks.length - 1 - i}>{formatClickRecord(c)}</li>)
          )}
        </ul>
      </div>
      <button
        type="button"
        data-testid="mouse-clear"
        className={BTN_CLASS}
        onClick={() => {
          setClicks([])
          setDoubleCount(0)
          setLastAction('在下方测试区点击或滚动鼠标')
        }}
      >
        清空记录
      </button>
    </div>
  )
}
