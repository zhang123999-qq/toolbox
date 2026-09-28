import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { AudioRecordFormOptions, AudioRecordInput } from './schema'
import {
  RECORDER_STATUS_TEXT,
  formatBytes,
  formatDuration,
  mimeToExtension,
  nextRecorderStatus,
  pickMimeType,
  recordFileName,
  recorderEventText,
} from './utils'
import type { RecorderEvent, RecorderStatus } from './utils'

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly bytes: number
  readonly mime: string
}

interface BrowserGlobals {
  MediaRecorder?: {
    new (stream: MediaStream, options?: { mimeType?: string }): MediaRecorder
    isTypeSupported: (mimeType: string) => boolean
  }
}

/**
 * 在线录音机：MediaRecorder / getUserMedia 只允许出现在这里，
 * 录音状态机等逻辑在 utils 纯函数里，可在 node 下测试。
 */
export default function Tool() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [requesting, setRequesting] = useState(false)

  const statusRef = useRef<RecorderStatus>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef(0)
  const baseMsRef = useRef(0)
  const startAtRef = useRef(0)

  function setStatusBoth(next: RecorderStatus): void {
    statusRef.current = next
    setStatus(next)
  }

  /** 状态机迁移：非法操作抛中文错 */
  function transition(event: RecorderEvent): void {
    setStatusBoth(nextRecorderStatus(statusRef.current, event))
  }

  function stopTimer(): void {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = 0
    }
  }

  function startTimer(): void {
    stopTimer()
    startAtRef.current = Date.now()
    timerRef.current = window.setInterval(() => {
      setElapsedMs(baseMsRef.current + (Date.now() - startAtRef.current))
    }, 250)
  }

  /** 录音结束：组装 Blob → 对象 URL → 播放器 */
  function finishRecording(mimeType: string): void {
    const blob = new Blob(chunksRef.current, { type: mimeType })
    const url = URL.createObjectURL(blob)
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    const fileName = recordFileName(mimeType)
    const report = [
      `录音时长：${formatDuration(baseMsRef.current)}`,
      `编码格式：${mimeType || '浏览器默认'}（.${mimeToExtension(mimeType)}）`,
      `文件大小：${formatBytes(blob.size)}`,
    ].join('\n')
    setResult({ fileName, report, bytes: blob.size, mime: mimeType })
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  /** 开始录音：能力检查 → 状态机 → 申请麦克风 → 启动 MediaRecorder */
  async function handleStart(): Promise<void> {
    setError('')
    const g = globalThis as unknown as BrowserGlobals
    if (!g.MediaRecorder) {
      setError('当前浏览器不支持 MediaRecorder，无法录音（请换 Chrome / Edge / Safari 试试）')
      return
    }
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持麦克风采集（getUserMedia），无法录音')
      return
    }
    try {
      transition('start')
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作非法')
      return
    }
    setRequesting(true)
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType((m) => g.MediaRecorder!.isTypeSupported(m))
      const recorder = new g.MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      baseMsRef.current = 0
      setElapsedMs(0)
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => finishRecording(recorder.mimeType)
      recorderRef.current = recorder
      recorder.start(250)
      startTimer()
      setResult(null)
    } catch (err) {
      setStatusBoth('idle')
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setError(
        err instanceof Error
          ? `麦克风不可用：${err.message}（请检查浏览器麦克风权限）`
          : '麦克风不可用，请检查浏览器麦克风权限',
      )
    } finally {
      setRequesting(false)
    }
  }

  function handlePause(): void {
    try {
      transition('pause')
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作非法')
      return
    }
    baseMsRef.current += Date.now() - startAtRef.current
    stopTimer()
    setElapsedMs(baseMsRef.current)
    recorderRef.current?.pause()
  }

  function handleResume(): void {
    try {
      transition('resume')
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作非法')
      return
    }
    recorderRef.current?.resume()
    startTimer()
  }

  function handleStop(): void {
    try {
      transition('stop')
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作非法')
      return
    }
    baseMsRef.current += Date.now() - startAtRef.current
    stopTimer()
    setElapsedMs(baseMsRef.current)
    recorderRef.current?.stop()
  }

  function handleReset(): void {
    try {
      transition('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作非法')
      return
    }
    setResult(null)
    setElapsedMs(0)
    baseMsRef.current = 0
  }

  useEffect(
    () => () => {
      stopTimer()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const canControl = status === 'recording' || status === 'paused'

  return (
    <MultiPanel<AudioRecordInput, AudioRecordFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {status === 'idle' || status === 'stopped' ? (
              <button
                type="button"
                data-testid="record-start"
                className={SECONDARY_BUTTON}
                disabled={requesting}
                onClick={() => void handleStart()}
              >
                {requesting ? '正在请求麦克风…' : status === 'stopped' ? '再录一段' : '开始录音'}
              </button>
            ) : null}
            {status === 'recording' ? (
              <button
                type="button"
                data-testid="record-pause"
                className={SECONDARY_BUTTON}
                onClick={handlePause}
              >
                暂停
              </button>
            ) : null}
            {status === 'paused' ? (
              <button
                type="button"
                data-testid="record-resume"
                className={SECONDARY_BUTTON}
                onClick={handleResume}
              >
                继续
              </button>
            ) : null}
            {canControl ? (
              <button
                type="button"
                data-testid="record-stop"
                className={SECONDARY_BUTTON}
                onClick={handleStop}
              >
                停止
              </button>
            ) : null}
            {status === 'stopped' ? (
              <button
                type="button"
                data-testid="record-reset"
                className={SECONDARY_BUTTON}
                onClick={handleReset}
              >
                重置
              </button>
            ) : null}
            <span
              data-testid="record-status"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              状态：{RECORDER_STATUS_TEXT[status]}
            </span>
            <span
              data-testid="record-elapsed"
              className="font-mono text-sm text-slate-700 dark:text-slate-300"
            >
              {formatDuration(elapsedMs)}
            </span>
          </div>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {result ? (
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 用户上传/生成的音频没有字幕轨道 */}
              <audio controls src={resultUrl} data-testid="player" className="w-full" />
              <p
                data-testid="result-info"
                className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
              >
                {result.report}
              </p>
              <div>
                <a
                  href={resultUrl}
                  download={result.fileName}
                  data-testid="download-audio"
                  className={SECONDARY_BUTTON}
                >
                  下载录音（{formatBytes(result.bytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !error && status !== 'recording' && status !== 'paused' ? (
            <p className="text-sm text-slate-500">
              点「开始录音」并允许浏览器使用麦克风，即可在本地录音；支持{recorderEventText('pause')}{' '}
              / {recorderEventText('resume')}。录音全程留在浏览器内存里，不发任何请求。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}
