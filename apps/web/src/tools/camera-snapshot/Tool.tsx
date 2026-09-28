import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { canvasToBlob, downloadBlob, drawScaled } from '../../lib/image'
import {
  buildOutputFileName,
  getSupportError,
  mapCameraError,
  mirrorStyle,
  stopAllTracks,
} from './utils'
import type { CameraErrorKind } from './utils'
import type { CameraSnapshotOptions } from './schema'

interface SnapshotResult {
  url: string
  fileName: string
  blob: Blob
}

/**
 * 错误种类 → i18n 键。
 * 键值对由协调员统一合并进 messages 文件（worker 不直接改 messages 文件），
 * 合并后 tsc 校验 key 对齐；此处不做 as MessageKey 透传。
 */
const ERROR_KEYS = {
  unsupported: 'cameraSnapshot.error.unsupported',
  denied: 'cameraSnapshot.error.denied',
  notfound: 'cameraSnapshot.error.notfound',
  overconstrained: 'cameraSnapshot.error.overconstrained',
  notready: 'cameraSnapshot.error.notReady',
  failed: 'cameraSnapshot.error.failed',
} as const

export default function Tool() {
  const t = useTranslate()
  const streamRef = useRef<MediaStream | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const [options, setOptions] = useState<CameraSnapshotOptions>({ facing: 'user', mirror: 'on' })
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [result, setResult] = useState<SnapshotResult | null>(null)
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null)
  const [processing, setProcessing] = useState(false)

  const error = errorKind === null ? null : t(ERROR_KEYS[errorKind])

  // 组件卸载时释放摄像头
  useEffect(() => {
    return () => {
      stopAllTracks(streamRef.current)
      streamRef.current = null
    }
  }, [])

  /** video 挂载时绑定当前流并静音（自动播放需要），卸载时解绑元素引用 */
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el
    if (el === null) return
    el.srcObject = streamRef.current
    el.muted = true
  }, [])

  const openCamera = useCallback(async (facing: CameraSnapshotOptions['facing']) => {
    setProcessing(true)
    setErrorKind(null)
    const unsupported = getSupportError(!!navigator.mediaDevices?.getUserMedia)
    if (unsupported !== null) {
      setErrorKind(unsupported)
      setProcessing(false)
      return
    }
    // 先停掉旧流的所有 track，再请求新流
    stopAllTracks(streamRef.current)
    streamRef.current = null
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      })
      streamRef.current = next
      setStream(next)
    } catch (err) {
      setErrorKind(mapCameraError(err))
    }
    setProcessing(false)
  }, [])

  const closeCamera = useCallback(() => {
    stopAllTracks(streamRef.current)
    streamRef.current = null
    setStream(null)
    setErrorKind(null)
  }, [])

  const handleOptionChange = useCallback(
    (patch: Partial<CameraSnapshotOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 相机已打开时，选项变更自动重开流（openCamera 内部先释放旧流）
      if (streamRef.current !== null) {
        void openCamera(next.facing)
      }
    },
    [options, openCamera],
  )

  const snap = useCallback(async () => {
    const video = videoElRef.current
    // readyState ≥ 2（HAVE_CURRENT_DATA）才有可截取的当前帧
    if (video === null || video.readyState < 2) {
      setErrorKind('notready')
      return
    }
    setProcessing(true)
    setErrorKind(null)
    try {
      const w = video.videoWidth
      const h = video.videoHeight
      const canvas = drawScaled(video, w, h, w, h)
      const blob = await canvasToBlob(canvas, 'image/png')
      const url = URL.createObjectURL(blob)
      setResult({ url, fileName: buildOutputFileName(new Date()), blob })
    } catch {
      setErrorKind('failed')
    }
    setProcessing(false)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('cameraSnapshot.note')}</p>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('cameraSnapshot.facing')}
          <select
            data-testid="opt-facing"
            value={options.facing}
            onChange={(e) =>
              handleOptionChange({ facing: e.target.value as CameraSnapshotOptions['facing'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="user">{t('cameraSnapshot.facingUser')}</option>
            <option value="environment">{t('cameraSnapshot.facingEnvironment')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('cameraSnapshot.mirror')}
          <select
            data-testid="opt-mirror"
            value={options.mirror}
            onChange={(e) =>
              handleOptionChange({ mirror: e.target.value as CameraSnapshotOptions['mirror'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="on">{t('cameraSnapshot.mirrorOn')}</option>
            <option value="off">{t('cameraSnapshot.mirrorOff')}</option>
          </select>
        </label>
      </div>

      {/* 操作按钮：未打开时只显示「打开相机」 */}
      <div className="flex flex-wrap gap-2">
        {stream === null ? (
          <button
            data-testid="open"
            type="button"
            disabled={processing}
            onClick={() => void openCamera(options.facing)}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('cameraSnapshot.open')}
          </button>
        ) : (
          <>
            <button
              data-testid="snap"
              type="button"
              disabled={processing}
              onClick={() => void snap()}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t('cameraSnapshot.snap')}
            </button>
            <button
              data-testid="close"
              type="button"
              onClick={closeCamera}
              className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              {t('cameraSnapshot.close')}
            </button>
          </>
        )}
      </div>

      {processing && <p data-testid="processing">{t('cameraSnapshot.processing')}</p>}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 预览区 */}
      {stream === null ? (
        <p className="text-sm text-slate-500">{t('cameraSnapshot.idle')}</p>
      ) : (
        <figure>
          <figcaption className="mb-1 text-sm text-slate-500">
            {t('cameraSnapshot.preview')}
          </figcaption>
          <video
            data-testid="preview-video"
            ref={attachVideo}
            autoPlay
            playsInline
            className="max-h-96 w-full rounded border bg-black object-contain"
            style={{ transform: mirrorStyle(options.mirror === 'on') }}
          >
            {/* 实时摄像头预览无字幕文件，占位 track 满足 a11y 要求 */}
            <track kind="captions" />
          </video>
        </figure>
      )}

      {/* 拍摄结果：仅 result 非空渲染，下载按钮随之出现 */}
      {result !== null && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {t('cameraSnapshot.result')}
            </figcaption>
            <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
          </figure>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('cameraSnapshot.download')}
          </button>
        </div>
      )}
    </div>
  )
}
