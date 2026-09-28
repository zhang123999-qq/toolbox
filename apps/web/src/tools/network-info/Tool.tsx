import { useState } from 'react'
import { meta } from './meta'
import { describeConnection, effectiveTypeText, getNetworkInfo } from './utils'
import type { NetworkInfo } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS = 'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

/**
 * 网络信息：读取 navigator.connection，经 utils 纯函数输出；
 * 无 API 时字段兜底为"未知"，不阻断展示。
 */
export default function Tool() {
  const [info, setInfo] = useState<NetworkInfo | null>(null)
  const [error, setError] = useState('')

  function refresh(): void {
    setError('')
    try {
      setInfo(getNetworkInfo(navigator as unknown as Parameters<typeof getNetworkInfo>[0]))
    } catch (e) {
      setInfo(null)
      setError(e instanceof Error ? e.message : '检测失败')
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" className={BTN_CLASS} data-testid="network-refresh" onClick={refresh}>
        检测网络信息
      </button>
      {error && (
        <p className="text-sm text-red-600" data-testid="network-error">
          {error}
        </p>
      )}
      {info && (
        <div data-testid="network-info">
          <p
            className="mb-2 text-sm text-slate-600 dark:text-slate-300"
            data-testid="network-summary"
          >
            {describeConnection(info)}
          </p>
          <dl>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">在线状态</dt>
              <dd data-testid="network-online">{info.online ? '在线' : '离线'}</dd>
            </div>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">网络类型</dt>
              <dd data-testid="network-type">{effectiveTypeText(info.effectiveType)}</dd>
            </div>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">下行速率</dt>
              <dd data-testid="network-downlink">
                {info.downlink == null ? '未知' : `${info.downlink} Mbps`}
              </dd>
            </div>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">RTT</dt>
              <dd data-testid="network-rtt">{info.rtt == null ? '未知' : `${info.rtt} ms`}</dd>
            </div>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">省流模式</dt>
              <dd data-testid="network-savedata">{info.saveData ? '已开启' : '未开启'}</dd>
            </div>
          </dl>
        </div>
      )}
      <p className="text-xs text-slate-400">
        Network Information API 仅部分浏览器支持，数值为估算。工具信息：{meta.title}（#862）
      </p>
    </div>
  )
}
