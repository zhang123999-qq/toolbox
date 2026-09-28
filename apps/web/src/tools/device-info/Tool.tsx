import { useState } from 'react'
import type { ReactNode } from 'react'
import { meta } from './meta'
import { getDeviceInfo } from './utils'
import type { DeviceInfo } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS =
  'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

function row(label: string, value: string, testId: string): ReactNode {
  return (
    <div className={ROW_CLASS}>
      <dt className="text-slate-500">{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  )
}

/**
 * 设备信息：读取 navigator，经 utils 纯函数输出；字段缺失自动兜底。
 */
export default function Tool() {
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState('')

  function refresh(): void {
    setError('')
    try {
      setInfo(getDeviceInfo(navigator as unknown as Parameters<typeof getDeviceInfo>[0]))
    } catch (e) {
      setInfo(null)
      setError(e instanceof Error ? e.message : '检测失败')
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" className={BTN_CLASS} data-testid="device-refresh" onClick={refresh}>
        检测设备信息
      </button>
      {error && (
        <p className="text-sm text-red-600" data-testid="device-error">
          {error}
        </p>
      )}
      {info && (
        <dl data-testid="device-info">
          {row('设备类型', info.typeText, 'device-type')}
          {row('平台', info.platform, 'device-platform')}
          {row('CPU 核心数', String(info.cores), 'device-cores')}
          {row('设备内存', info.memoryGB == null ? '未知' : `${info.memoryGB} GB`, 'device-memory')}
          {row('移动端 UA 提示', info.mobileHint ? '是' : '否', 'device-mobile')}
          {row('语言', info.language, 'device-language')}
          {row('触屏支持', info.touch ? '是' : '否', 'device-touch')}
        </dl>
      )}
      <p className="text-xs text-slate-400">工具信息：{meta.title}（#860）</p>
    </div>
  )
}
