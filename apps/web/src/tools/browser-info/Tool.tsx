import { useState } from 'react'
import { meta } from './meta'
import { FEATURE_CHECKS, detectFeatures, parseUA } from './utils'
import type { BrowserInfo } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS = 'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

/**
 * 浏览器信息：解析 navigator.userAgent，经 utils 纯函数输出；
 * 特性检测注入 window，node 下可测。
 */
export default function Tool() {
  const [info, setInfo] = useState<BrowserInfo | null>(null)
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null)
  const [error, setError] = useState('')

  function refresh(): void {
    setError('')
    try {
      setInfo(parseUA(navigator.userAgent))
      setFeatures(detectFeatures(window as unknown as Record<string, unknown>))
    } catch (e) {
      setInfo(null)
      setFeatures(null)
      setError(e instanceof Error ? e.message : '检测失败')
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" className={BTN_CLASS} data-testid="browser-refresh" onClick={refresh}>
        检测浏览器信息
      </button>
      {error && (
        <p className="text-sm text-red-600" data-testid="browser-error">
          {error}
        </p>
      )}
      {info && (
        <dl data-testid="browser-info">
          <div className={ROW_CLASS}>
            <dt className="text-slate-500">浏览器</dt>
            <dd data-testid="browser-name">
              {info.browser} {info.version}
            </dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className="text-slate-500">渲染引擎</dt>
            <dd data-testid="browser-engine">{info.engine || '未知'}</dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className="text-slate-500">操作系统</dt>
            <dd data-testid="browser-os">{info.os}</dd>
          </div>
        </dl>
      )}
      {features && (
        <div data-testid="browser-features">
          <h3 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            Web 特性支持
          </h3>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {FEATURE_CHECKS.map((f) => (
              <li
                key={f.id}
                data-testid={`feature-${f.id}`}
                className="rounded border border-slate-200 px-2 py-1.5 dark:border-slate-700"
              >
                <span className={features[f.id] ? 'text-green-600' : 'text-slate-400'}>
                  {features[f.id] ? '✓' : '✗'}
                </span>{' '}
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-400">
        说明：UA 可被修改，仅供参考。工具信息：{meta.title}（#859）
      </p>
    </div>
  )
}
