import { useState } from 'react'
import { meta } from './meta'
import { describePattern, PATTERNS, vibrate } from './utils'
import type { VibrateNavigatorLike } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * 震动测试：点击预设模式触发设备震动；vibrate 可注入；
 * API 缺失或浏览器拒绝时中文提示。
 */
export default function Tool() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  function play(key: string): void {
    setError('')
    setResult('')
    const preset = PATTERNS[key]
    if (!preset) {
      setError('未知预设模式')
      return
    }
    try {
      const nav = navigator as unknown as VibrateNavigatorLike
      const ok = vibrate(nav, preset.pattern)
      setResult(
        ok
          ? `已触发：${preset.label}（${describePattern(preset.pattern)}）`
          : `浏览器拒绝了震动请求：${preset.label}`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '震动失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(PATTERNS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            className={BTN_CLASS}
            data-testid={`vibration-${key}`}
            onClick={() => play(key)}
            title={describePattern(preset.pattern)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {result && (
        <p
          className="text-sm text-emerald-700 dark:text-emerald-400"
          data-testid="vibration-result"
        >
          {result}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" data-testid="vibration-error">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">
        桌面浏览器大多不支持震动，请在手机浏览器中体验。工具信息：{meta.title}（#866）
      </p>
    </div>
  )
}
