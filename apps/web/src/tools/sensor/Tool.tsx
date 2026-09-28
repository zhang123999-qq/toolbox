import { useEffect, useState } from 'react'
import { meta } from './meta'
import {
  formatAccel,
  formatTilt,
  motionMagnitude,
  readMotion,
  requestMotionPermission,
  tiltFromOrientation,
} from './utils'
import type { Accel, MotionRequestorLike, Tilt } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ROW_CLASS =
  'flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-800'

/**
 * 传感器：监听 devicemotion / deviceorientation 实时显示加速度与倾斜角；
 * 事件解析在 utils 纯函数中；iOS 上先申请权限。
 */
export default function Tool() {
  const [accel, setAccel] = useState<Accel>({ x: null, y: null, z: null })
  const [tilt, setTilt] = useState<Tilt>({ pitch: null, roll: null })
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!listening) return
    const onMotion = (ev: Event): void => {
      setAccel(readMotion(ev as unknown as Parameters<typeof readMotion>[0]))
    }
    const onOrient = (ev: Event): void => {
      setTilt(tiltFromOrientation(ev as unknown as Parameters<typeof tiltFromOrientation>[0]))
    }
    window.addEventListener('devicemotion', onMotion)
    window.addEventListener('deviceorientation', onOrient)
    return () => {
      window.removeEventListener('devicemotion', onMotion)
      window.removeEventListener('deviceorientation', onOrient)
    }
  }, [listening])

  async function start(): Promise<void> {
    setError('')
    try {
      const dm = (window as unknown as { DeviceMotionEvent?: MotionRequestorLike })
        .DeviceMotionEvent
      const p = await requestMotionPermission(dm ?? null)
      if (p !== 'granted' && p !== 'not-required') {
        throw new Error('未获得运动传感器权限')
      }
      setListening(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动失败')
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className={BTN_CLASS}
        data-testid="sensor-start"
        disabled={listening}
        onClick={() => void start()}
      >
        {listening ? '监听中…' : '开始监听传感器'}
      </button>
      {error && (
        <p className="text-sm text-red-600" data-testid="sensor-error">
          {error}
        </p>
      )}
      <dl>
        <div className={ROW_CLASS}>
          <dt className="text-slate-500">加速度（含重力）</dt>
          <dd data-testid="sensor-accel">{formatAccel(accel)}</dd>
        </div>
        <div className={ROW_CLASS}>
          <dt className="text-slate-500">合成加速度</dt>
          <dd data-testid="sensor-magnitude">{motionMagnitude(accel).toFixed(2)} m/s²</dd>
        </div>
        <div className={ROW_CLASS}>
          <dt className="text-slate-500">倾斜角</dt>
          <dd data-testid="sensor-tilt">{formatTilt(tilt)}</dd>
        </div>
      </dl>
      <p className="text-xs text-slate-400">
        需要 HTTPS 环境；桌面设备通常无传感器，显示"未知"属正常。iOS 需先授权运动传感器。工具信息：
        {meta.title}（#867）
      </p>
    </div>
  )
}
