import { useState } from 'react'
import { meta } from './meta'
import { batteryLevel, batteryStatus, getBattery } from './utils'
import type { BatteryRaw } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS = 'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

const LEVEL_TEXT: Record<string, string> = {
  full: '满电',
  high: '充足',
  medium: '中等',
  low: '偏低',
}

/**
 * 电池信息：经 navigator.getBattery 读取，API 缺失时中文提示；
 * 读取逻辑在 utils 纯函数中（navigator 可注入）。
 */
export default function Tool() {
  const [info, setInfo] = useState<BatteryRaw | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function refresh(): Promise<void> {
    setError('')
    setLoading(true)
    try {
      const b = await getBattery(navigator as unknown as Parameters<typeof getBattery>[0])
      setInfo(b)
    } catch (e) {
      setInfo(null)
      setError(e instanceof Error ? e.message : '读取失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className={BTN_CLASS}
        data-testid="battery-refresh"
        disabled={loading}
        onClick={() => void refresh()}
      >
        {loading ? '读取中…' : '检测电池信息'}
      </button>
      {error && (
        <p className="text-sm text-red-600" data-testid="battery-error">
          {error}
        </p>
      )}
      {info && (
        <div data-testid="battery-info">
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-300" data-testid="battery-status">
            {batteryStatus(info)}
          </p>
          <dl>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">电量等级</dt>
              <dd data-testid="battery-level">
                {LEVEL_TEXT[batteryLevel(Math.round(info.level * 100))]}
              </dd>
            </div>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">充电状态</dt>
              <dd data-testid="battery-charging">{info.charging ? '充电中' : '未充电'}</dd>
            </div>
          </dl>
        </div>
      )}
      <p className="text-xs text-slate-400">
        仅部分 Chromium 桌面浏览器支持 Battery Status API。工具信息：{meta.title}（#861）
      </p>
    </div>
  )
}
