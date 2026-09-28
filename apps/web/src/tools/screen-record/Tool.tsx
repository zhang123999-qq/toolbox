import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import type { ScreenRecordOptions } from './schema'
import {
  MIME_CANDIDATES,
  buildOutputFileName,
  formatDuration,
  mapRecordError,
  pickMimeType,
} from './utils'

interface Result {
  url: string
  fileName: string
  blob: Blob
}

type Status = 'idle' | 'recording' | 'done'

const CODEC_OPTIONS: ReadonlyArray<ScreenRecordOptions['codec']> = ['auto', 'vp9', 'vp8']
const AUDIO_OPTIONS: ReadonlyArray<ScreenRecordOptions['audio']> = ['on', 'off']

export default function Tool() {
  const t = useTranslate()
  const [status, setStatus] = useState<Status>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<ScreenRecordOptions>({ codec: 'auto', audio: 'on' })

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /**
   * 统一收尾：停计时器 → recorder.stop()（仅 recording 状态，避免重复触发）
   * → 停掉所有采集轨道。只读写 ref 与 setState，回调稳定，
   * 可直接用作停止按钮、track.onended 与组件卸载的 cleanup。
   */
  const teardown = useCallback(() => {
    stopTimer()
    const rec = recorderRef.current
    recorderRef.current = null
    if (rec && rec.state === 'recording') rec.stop()
    const s = streamRef.current
    streamRef.current = null
    if (s) s.getTracks().forEach((tr) => tr.stop())
  }, [stopTimer])

  // 卸载时收尾：录制中则 stop，非录制中仅清计时器（teardown 内部已处理空 recorder / 空 stream）
  useEffect(() => () => teardown(), [teardown])

  const handleStart = useCallback(async () => {
    if (
      typeof MediaRecorder === 'undefined' ||
      typeof navigator.mediaDevices?.getDisplayMedia !== 'function'
    ) {
      setError(t('screenRecord.error.unsupported'))
      return
    }
    setError(null)
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: options.audio === 'on',
      })
      const mimeType = pickMimeType(
        (m) => MediaRecorder.isTypeSupported(m),
        MIME_CANDIDATES,
        options.codec,
      )
      if (!mimeType) {
        stream.getTracks().forEach((tr) => tr.stop())
        setError(t('screenRecord.error.noMimeType'))
        return
      }
      const chunks: Blob[] = []
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.onstop = () => {
        stopTimer()
        const blob = new Blob(chunks, { type: 'video/webm' })
        setResult({
          url: URL.createObjectURL(blob),
          fileName: buildOutputFileName(new Date()),
          blob,
        })
        setStatus('done')
      }
      recorderRef.current = recorder
      // 用户在浏览器原生 UI 里点"停止共享"时同样走统一收尾
      stream.getVideoTracks().forEach((tr) => {
        tr.onended = teardown
      })
      recorder.start()
      setStatus('recording')
      setElapsedMs(0)
      timerRef.current = window.setInterval(() => {
        setElapsedMs((v) => v + 1000)
      }, 1000)
    } catch (err) {
      setError(mapRecordError(err))
    }
  }, [options, stopTimer, t, teardown])

  const attachPreview = useCallback((el: HTMLVideoElement | null) => {
    if (el) el.srcObject = streamRef.current
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('screenRecord.note')}</p>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('screenRecord.codec')}
          <select
            data-testid="opt-codec"
            value={options.codec}
            disabled={status === 'recording'}
            onChange={(e) =>
              setOptions((o) => ({ ...o, codec: e.target.value as ScreenRecordOptions['codec'] }))
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {CODEC_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {t(`screenRecord.codec.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('screenRecord.audio')}
          <select
            data-testid="opt-audio"
            value={options.audio}
            disabled={status === 'recording'}
            onChange={(e) =>
              setOptions((o) => ({ ...o, audio: e.target.value as ScreenRecordOptions['audio'] }))
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {AUDIO_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`screenRecord.audio.${a}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center gap-3">
        {status !== 'recording' ? (
          <button
            data-testid="start"
            type="button"
            onClick={() => void handleStart()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('screenRecord.start')}
          </button>
        ) : (
          <button
            data-testid="stop"
            type="button"
            onClick={teardown}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            {t('screenRecord.stop')}
          </button>
        )}
        {status === 'recording' && (
          <p data-testid="timer" className="font-mono text-lg tabular-nums">
            {formatDuration(elapsedMs)}
          </p>
        )}
      </div>

      {status === 'recording' && (
        <p className="text-sm text-red-600 dark:text-red-400">{t('screenRecord.recording')}</p>
      )}

      {/* 录制中预览 */}
      {status === 'recording' && (
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
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('screenRecord.result')}</p>
          <video
            data-testid="result-video"
            src={result.url}
            controls
            className="max-h-96 rounded border object-contain"
          >
            {/* 用户录制的视频无字幕文件，占位 track 满足 a11y 要求 */}
            <track kind="captions" />
          </video>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('screenRecord.download')}
          </button>
        </div>
      )}
    </div>
  )
}
