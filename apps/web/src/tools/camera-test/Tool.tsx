import { useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import {
  CAMERA_STATUS_TEXT,
  RESOLUTION_PRESETS,
  getCameraStream,
  listCameras,
} from './utils'
import type { CameraDevice, CameraStatus } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const SELECT_CLASS =
  'rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'

/**
 * 摄像头测试：getUserMedia / enumerateDevices / video 元素只允许出现在这里，
 * 约束构造与设备枚举在 utils 纯函数里。停止时释放轨道。
 */
export default function Tool() {
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [devices, setDevices] = useState<readonly CameraDevice[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [presetId, setPresetId] = useState('vga')
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  function stop(): void {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop()
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }

  useEffect(() => stop, [])

  async function refreshDevices(): Promise<void> {
    try {
      const cams = await listCameras(navigator.mediaDevices)
      setDevices(cams)
    } catch {
      setStatus('unsupported')
    }
  }

  async function start(): Promise<void> {
    setStatus('requesting')
    await refreshDevices()
    try {
      const stream = await getCameraStream(navigator.mediaDevices, presetId, deviceId)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch {
          // jsdom 等环境无 play 实现：预览绑定已完成，忽略播放错误
        }
      }
      setStatus('active')
    } catch {
      stop()
      setStatus('denied')
    }
  }

  async function switchPreset(next: string): Promise<void> {
    setPresetId(next)
    if (status === 'active') {
      stop()
      setStatus('requesting')
      try {
        const stream = await getCameraStream(navigator.mediaDevices, next, deviceId)
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch {
            // jsdom 等环境无 play 实现：预览绑定已完成，忽略播放错误
          }
        }
        setStatus('active')
      } catch {
        stop()
        setStatus('denied')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
      <p data-testid="camera-status" className="text-sm font-medium text-slate-800 dark:text-slate-200">
        状态：{CAMERA_STATUS_TEXT[status]}
      </p>
      <video
        ref={videoRef}
        data-testid="camera-video"
        muted
        playsInline
        className="max-h-72 w-full rounded border border-slate-300 bg-black object-contain dark:border-slate-700"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="camera-device" className="text-sm text-slate-600 dark:text-slate-400">
          摄像头：
        </label>
        <select
          id="camera-device"
          data-testid="camera-device"
          className={SELECT_CLASS}
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        >
          <option value="">默认</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
        <label htmlFor="camera-preset" className="text-sm text-slate-600 dark:text-slate-400">
          分辨率：
        </label>
        <select
          id="camera-preset"
          data-testid="camera-preset"
          className={SELECT_CLASS}
          value={presetId}
          onChange={(e) => void switchPreset(e.target.value)}
        >
          {RESOLUTION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        {status === 'active' ? (
          <button type="button" data-testid="camera-stop" className={BTN_CLASS} onClick={stop}>
            停止预览
          </button>
        ) : (
          <button
            type="button"
            data-testid="camera-start"
            className={BTN_CLASS}
            onClick={start}
            disabled={status === 'requesting'}
          >
            开始预览
          </button>
        )}
        <button type="button" data-testid="camera-refresh" className={BTN_CLASS} onClick={refreshDevices}>
          刷新设备列表
        </button>
      </div>
    </div>
  )
}
