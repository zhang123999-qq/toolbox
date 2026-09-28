import { useState } from 'react'
import { meta } from './meta'
import { coordsToMapLink, formatCoords, getPosition } from './utils'
import type { GeoCoords, GeolocationLike } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS =
  'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

/**
 * 地理位置：经 navigator.geolocation 定位，API 缺失或用户拒绝时中文提示；
 * 定位逻辑在 utils 纯函数中（geolocation 可注入）。
 */
export default function Tool() {
  const [coords, setCoords] = useState<GeoCoords | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function currentGeo(): GeolocationLike | null {
    if (typeof navigator === 'undefined') return null
    return (navigator as unknown as { geolocation?: GeolocationLike }).geolocation ?? null
  }

  async function locate(): Promise<void> {
    setError('')
    setLoading(true)
    try {
      const c = await getPosition(currentGeo())
      setCoords(c)
    } catch (e) {
      setCoords(null)
      setError(e instanceof Error ? e.message : '定位失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className={BTN_CLASS}
        data-testid="geolocation-locate"
        disabled={loading}
        onClick={() => void locate()}
      >
        {loading ? '定位中…' : '获取当前位置'}
      </button>
      {error && (
        <p className="text-sm text-red-600" data-testid="geolocation-error">
          {error}
        </p>
      )}
      {coords && (
        <div data-testid="geolocation-result">
          <p
            className="mb-2 text-sm text-slate-600 dark:text-slate-300"
            data-testid="geolocation-text"
          >
            {formatCoords(coords)}
          </p>
          <dl>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">海拔</dt>
              <dd data-testid="geolocation-altitude">
                {coords.altitude == null ? '未知' : `${coords.altitude.toFixed(1)} 米`}
              </dd>
            </div>
            <div className={ROW_CLASS}>
              <dt className="text-slate-500">速度</dt>
              <dd data-testid="geolocation-speed">
                {coords.speed == null ? '未知' : `${coords.speed.toFixed(1)} 米/秒`}
              </dd>
            </div>
          </dl>
          <a
            href={coordsToMapLink(coords.latitude, coords.longitude)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-sky-600 underline dark:text-sky-400"
            data-testid="geolocation-map-link"
          >
            在 OpenStreetMap 上查看
          </a>
        </div>
      )}
      <p className="text-xs text-slate-400">
        需要 HTTPS 环境并经你授权后才能定位；位置数据仅用于展示，不会上传。工具信息：{meta.title}
        （#863）
      </p>
    </div>
  )
}
