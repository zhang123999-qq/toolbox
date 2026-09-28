import { useEffect, useState } from 'react'
import { meta } from './meta'
import { formatKeyLabel, normalizeKey, trackPressed } from './utils'

const PANEL_CLASS =
  'rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'
const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * 键盘测试：监听全局 keydown / keyup，显示最后一次按键信息
 * 与当前按下的键集合。事件监听只允许出现在这里。
 */
export default function Tool() {
  const [lastLabel, setLastLabel] = useState('点击下方测试区，按下任意键开始检测')
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.repeat) return
      const info = normalizeKey(e)
      setLastLabel(formatKeyLabel(info))
      setPressed((prev) => trackPressed(prev, info.code, true))
    }
    function onKeyUp(e: KeyboardEvent): void {
      const info = normalizeKey(e)
      setPressed((prev) => trackPressed(prev, info.code, false))
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
      <div data-testid="keyboard-zone" className={`${PANEL_CLASS} min-h-24 focus:outline-none`}>
        <p
          data-testid="keyboard-last"
          className="text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          {lastLabel}
        </p>
      </div>
      <div className={PANEL_CLASS}>
        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
          当前按下的键（{pressed.size} 个）：
        </p>
        <p data-testid="keyboard-pressed" className="text-sm text-slate-800 dark:text-slate-200">
          {pressed.size === 0 ? '（无）' : [...pressed].sort().join('、')}
        </p>
      </div>
      <button
        type="button"
        data-testid="keyboard-clear"
        className={BTN_CLASS}
        onClick={() => {
          setPressed(new Set())
          setLastLabel('已清空，点击测试区重新检测')
        }}
      >
        清空记录
      </button>
    </div>
  )
}
