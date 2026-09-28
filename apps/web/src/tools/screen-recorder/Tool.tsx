import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { ScreenRecorderFormOptions, ScreenRecorderInput } from './schema'
import {
  CANDIDATE_MIMES,
  captureErrorMessage,
  extForMime,
  formatBytes,
  formatElapsed,
  pickMimeType,
  recorderFileName,
} from './utils'

type Phase = 'idle' | 'recording' | 'done'

interface MediaRecorderLike {
  ondataavailable: ((event: { data: Blob }) => void) | null
  onstop: (() => void) | null
  start: () => void
  stop: () => void
}

export default function Tool() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [resultUrl, setResultUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [error, setError] = useState('')
  const chunksRef = useRef<Blob[]>([])
  const recorderRef = useRef<MediaRecorderLike | null>(null)
  const streamRef = useRef<{ getTracks: () => { stop: () => void }[] } | null>(null)
  const timerRef = useRef<number | null>(null)

  const optionDefs: readonly OptionDef<ScreenRecorderFormOptions>[] = [
    { key: 'withAudio', label: '同时录制音频（浏览器支持才生效）', kind: 'boolean' },
  ]

  /** 卸载时兜底：停掉还在跑的录制与计时器 */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function stopTimer(): void {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopStream(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  /** 开始录制：能力检查 → getDisplayMedia → MediaRecorder */
  async function handleStart(withAudio: boolean): Promise<void> {
    setError('')
    const nav = navigator as Navigator & {
      mediaDevices?: { getDisplayMedia?: (c: unknown) => Promise<unknown> }
    }
    if (!nav.mediaDevices?.getDisplayMedia) {
      setError(
        '当前浏览器不支持屏幕录制（缺少 getDisplayMedia），请使用最新版 Chrome / Edge / Firefox',
      )
      return
    }
    const MR = (
      globalThis as unknown as {
        MediaRecorder?: (new (
          stream: unknown,
          options?: { mimeType?: string },
        ) => MediaRecorderLike & { mimeType?: string }) & {
          isTypeSupported?: (mimeType: string) => boolean
        }
      }
    ).MediaRecorder
    if (!MR) {
      setError(
        '当前浏览器不支持视频录制（缺少 MediaRecorder），请使用最新版 Chrome / Edge / Firefox',
      )
      return
    }
    try {
      const stream = (await nav.mediaDevices.getDisplayMedia({
        video: true,
        audio: withAudio,
      })) as { getTracks: () => { stop: () => void }[] }
      streamRef.current = stream
      const staticIsSupported: ((mimeType: string) => boolean) | undefined = MR.isTypeSupported
      const isSupported = (mime: string): boolean => staticIsSupported?.(mime) ?? false
      const mime = pickMimeType(CANDIDATE_MIMES, isSupported)
      const recorder = new MR(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stopTimer()
        stopStream()
        const ext = extForMime(mime)
        const blob = new Blob(chunksRef.current, { type: mime || `video/${ext}` })
        const url = URL.createObjectURL(blob)
        setResultUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        setFileName(recorderFileName(ext))
        setFileSize(blob.size)
        setPhase('done')
      }
      recorderRef.current = recorder
      setElapsed(0)
      recorder.start()
      setPhase('recording')
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 500)
      }, 500)
    } catch (err) {
      setError(captureErrorMessage(err))
    }
  }

  /** 停止录制：结果在 onstop 回调里发布 */
  function handleStop(): void {
    try {
      recorderRef.current?.stop()
    } catch {
      stopTimer()
      stopStream()
      setPhase('idle')
    }
    recorderRef.current = null
  }

  /** 丢弃当前结果，回到初始态 */
  function handleDiscard(): void {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    setFileName('')
    setFileSize(0)
    setElapsed(0)
    setPhase('idle')
  }

  return (
    <MultiPanel<ScreenRecorderInput, ScreenRecorderFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ withAudio: false }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {phase === 'idle' || phase === 'done' ? (
              <button
                type="button"
                data-testid="start-record"
                className={SECONDARY_BUTTON}
                onClick={() => void handleStart(options.withAudio)}
              >
                开始录制
              </button>
            ) : null}
            {phase === 'recording' ? (
              <>
                <span data-testid="elapsed" className="text-sm font-mono text-red-600">
                  ● 录制中 {formatElapsed(elapsed)}
                </span>
                <button
                  type="button"
                  data-testid="stop-record"
                  className={SECONDARY_BUTTON}
                  onClick={handleStop}
                >
                  停止录制
                </button>
              </>
            ) : null}
            {phase === 'done' ? (
              <button
                type="button"
                data-testid="discard"
                className={SECONDARY_BUTTON}
                onClick={handleDiscard}
              >
                丢弃并重新录制
              </button>
            ) : null}
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
          {phase === 'done' && resultUrl ? (
            <div className="flex flex-col gap-2">
              <video controls src={resultUrl} data-testid="player" className="w-full">
                <track kind="captions" />
              </video>
              <p data-testid="result-info" className="text-sm text-slate-700 dark:text-slate-300">
                录制完成：{fileName}（{formatBytes(fileSize)}）
              </p>
              <div>
                <a
                  href={resultUrl}
                  download={fileName}
                  data-testid="download-video"
                  className={SECONDARY_BUTTON}
                >
                  下载视频（{formatBytes(fileSize)}）
                </a>
              </div>
            </div>
          ) : null}
          {phase === 'idle' && !error ? (
            <p className="text-sm text-slate-500">
              点「开始录制」后在浏览器弹出的共享面板里选择要录制的屏幕 / 窗口 /
              标签页；停止后可预览并下载。全程本地录制，不上传任何数据。
            </p>
          ) : null}
        </div>
      )}
      toText={() => (phase === 'done' ? `录制完成：${fileName}（${formatBytes(fileSize)}）` : '')}
      downloadExt="txt"
    />
  )
}
