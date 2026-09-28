import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { canvasToBlob, createCanvas, downloadBlob } from '../../lib/image'
import { buildOutputFileName, getSupportError, mapCaptureError } from './utils'

/** 状态机：idle → requesting → preview → captured → idle */
type Phase = 'idle' | 'requesting' | 'preview' | 'captured'

interface CaptureResult {
  url: string
  fileName: string
  blob: Blob
}

/** 停止 stream 的所有 track，释放屏幕共享（空 stream 直接返回） */
function stopTracks(stream: MediaStream | null): void {
  if (stream === null) return
  stream.getTracks().forEach((track) => track.stop())
}

export default function Tool() {
  const t = useTranslate()
  const streamRef = useRef<MediaStream | null>(null)
  // video 元素引用恒非空：初始为游离 video 元素，真实元素挂载后替换，
  // 调用方无需空守卫（preview 阶段外按钮不可达，天然保证已挂载）。
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'))
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<CaptureResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // 卸载时释放屏幕共享，防止共享指示灯常亮
  useEffect(() => {
    return () => {
      stopTracks(streamRef.current)
      streamRef.current = null
    }
  }, [])

  /** video 挂载回调：preview 阶段挂载时 stream 已就绪，直接绑定并播放 */
  const attachPreview = useCallback((el: HTMLVideoElement | null) => {
    if (el === null) return
    videoRef.current = el
    el.srcObject = streamRef.current
    void el.play()
  }, [])

  const handleStart = useCallback(async () => {
    if (getSupportError(!!navigator.mediaDevices?.getDisplayMedia)) {
      setError(t('screenCapture.error.unsupported'))
      return
    }
    // 重新开始前先释放可能残留的旧流
    stopTracks(streamRef.current)
    streamRef.current = null
    setError(null)
    setResult(null)
    setPhase('requesting')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      streamRef.current = stream
      setPhase('preview')
    } catch (err) {
      const kind = mapCaptureError(err)
      if (kind === 'denied') setError(t('screenCapture.error.denied'))
      else if (kind === 'notfound') setError(t('screenCapture.error.notfound'))
      else setError(t('screenCapture.error.failed'))
      setPhase('idle')
    }
  }, [t])

  const handleCapture = useCallback(async () => {
    const video = videoRef.current
    if (video.readyState < 2) {
      setError(t('screenCapture.error.notReady'))
      return
    }
    setError(null)
    setProcessing(true)
    try {
      const canvas = createCanvas(video.videoWidth, video.videoHeight)
      const ctx = canvas.getContext('2d')
      if (ctx !== null) ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await canvasToBlob(canvas, 'image/png')
      const fileName = buildOutputFileName(Date.now())
      const url = URL.createObjectURL(blob)
      setResult({ url, fileName, blob })
      setPhase('captured')
      // 截取后立即自动下载，随后释放屏幕共享，避免指示灯常亮
      downloadBlob(blob, fileName)
      stopTracks(streamRef.current)
      streamRef.current = null
    } catch {
      setError(t('screenCapture.error.failed'))
    } finally {
      setProcessing(false)
    }
  }, [t])

  const handleStop = useCallback(() => {
    stopTracks(streamRef.current)
    streamRef.current = null
    videoRef.current.srcObject = null
    setPhase('idle')
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('screenCapture.note')}</p>

      {/* 控制按钮 */}
      <div className="flex items-center gap-3">
        {phase !== 'requesting' && phase !== 'preview' && (
          <button
            data-testid="start"
            type="button"
            onClick={() => void handleStart()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {phase === 'captured' ? t('screenCapture.restart') : t('screenCapture.start')}
          </button>
        )}
        {phase === 'preview' && (
          <>
            <button
              data-testid="capture"
              type="button"
              onClick={() => void handleCapture()}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t('screenCapture.capture')}
            </button>
            <button
              data-testid="stop"
              type="button"
              onClick={handleStop}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              {t('screenCapture.stop')}
            </button>
          </>
        )}
      </div>

      {(phase === 'requesting' || processing) && (
        <p data-testid="processing" className="text-sm text-slate-600 dark:text-slate-400">
          {phase === 'requesting' ? t('screenCapture.requesting') : t('screenCapture.processing')}
        </p>
      )}

      {/* 共享预览：仅 preview 阶段挂载，挂载即经 attachPreview 绑定 stream */}
      {phase === 'preview' && (
        <video
          data-testid="preview-video"
          ref={attachPreview}
          autoPlay
          muted
          playsInline
          className="max-h-96 rounded border object-contain"
        />
      )}

      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result !== null && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('screenCapture.result')}</p>
          <img src={result.url} alt="" className="max-h-96 rounded border object-contain" />
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('screenCapture.download')}
          </button>
        </div>
      )}
    </div>
  )
}
