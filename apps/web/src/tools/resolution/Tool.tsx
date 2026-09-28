import { useState } from 'react'
import { meta } from './meta'
import { COMMON_RESOLUTIONS, aspectRatio, getScreenInfo } from './utils'
import type { ScreenInfo } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS =
  'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

/**
 * 屏幕分辨率：读取 window.screen / window，全部经 utils 纯函数；
 * 非浏览器环境显示中文错误提示。
 */
export default function Tool() {
  const [info, setInfo] = useState<ScreenInfo | null>(null)
  const [error, setError] = useState('')

  function refresh(): void {
    setError('')
    try {
      const w = window as unknown as {
        innerWidth: number
        innerHeight: number
        devicePixelRatio: number
      }
      const s = window.screen as unknown as {
        width: number
        height: number
        colorDepth: number
      }
      setInfo(getScreenInfo(s, w))
    } catch (e) {
      setInfo(null)
      setError(e instanceof Error ? e.message : '读取失败')
    }
  }

  const ratio = info ? aspectRatio(info.screenW, info.screenH) : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={BTN_CLASS}
          data-testid="resolution-refresh"
          onClick={refresh}
        >
          检测屏幕信息
        </button>
        {ratio && (
          <span className="text-sm text-slate-500" data-testid="resolution-ratio">
            屏幕宽高比 {ratio}
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600" data-testid="resolution-error">
          {error}
        </p>
      )}
      {info && (
        <dl data-testid="resolution-info">
          <div className={ROW_CLASS}>
            <dt className="text-slate-500">屏幕分辨率</dt>
            <dd data-testid="resolution-screen">
              {info.screenW} × {info.screenH}
            </dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className="text-slate-500">浏览器视口</dt>
            <dd data-testid="resolution-viewport">
              {info.viewportW} × {info.viewportH}
            </dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className="text-slate-500">设备像素比（DPR）</dt>
            <dd data-testid="resolution-dpr">{info.dpr}</dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className="text-slate-500">色深</dt>
            <dd data-testid="resolution-depth">{info.colorDepth} 位</dd>
          </div>
        </dl>
      )}
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          常见分辨率对照
        </h3>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {COMMON_RESOLUTIONS.map((r) => (
            <li
              key={r.id}
              className="rounded border border-slate-200 px-2 py-1.5 dark:border-slate-700"
            >
              {r.name}
              <span className="ml-2 text-slate-500">
                {r.width}×{r.height}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate-400">
        工具信息：{meta.title}（#{858}）
      </p>
    </div>
  )
}
