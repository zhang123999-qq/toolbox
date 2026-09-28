import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { CameraPhotoFormOptions, CameraPhotoInput } from './schema'
import { cameraErrorMessage, dataUrlPayload, fitPhotoSize, photoFileName } from './utils'

type Phase = 'idle' | 'preview' | 'shot'

export default function Tool() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoSize, setPhotoSize] = useState({ width: 0, height: 0 })
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<{ getTracks: () => { stop: () => void }[] } | null>(null)

  const optionDefs: readonly OptionDef<CameraPhotoFormOptions>[] = [
    { key: 'maxSide', label: '导出最长边（像素，160–4096）', kind: 'text', placeholder: '1920' },
  ]

  /** 卸载时关掉摄像头 */
  useEffect(() => {
    return () => stopStream()
  }, [])

  function stopStream(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
  }

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  /** 打开摄像头：能力检查 → getUserMedia → 接到 video 预览 */
  async function handleOpen(): Promise<void> {
    setError('')
    const nav = navigator as Navigator & {
      mediaDevices?: { getUserMedia?: (c: unknown) => Promise<unknown> }
    }
    if (!nav.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持摄像头（缺少 getUserMedia），请使用最新版 Chrome / Edge / Firefox')
      return
    }
    try {
      const stream = (await nav.mediaDevices.getUserMedia({ video: true, audio: false })) as {
        getTracks: () => { stop: () => void }[]
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream as unknown as MediaStream
        await video.play().catch(() => undefined)
      }
      setPhase('preview')
    } catch (err) {
      setError(cameraErrorMessage(err))
    }
  }

  /** 关闭摄像头并回到初始态 */
  function handleClose(): void {
    stopStream()
    setPhase('idle')
  }

  /** 拍照：按选项尺寸把当前视频帧画到 canvas，导出 PNG */
  function handleCapture(raw: CameraPhotoFormOptions): void {
    setError('')
    try {
      const opts = optionsSchema.parse(raw)
      const video = videoRef.current
      if (!video || video.videoWidth === 0) throw new Error('摄像头画面尚未就绪，请稍候再试')
      const { width, height } = fitPhotoSize(video.videoWidth, video.videoHeight, opts.maxSide)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('当前浏览器无法绘制图片，请换用 Chrome / Edge 重试')
      ctx.drawImage(video, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/png')
      const payload = dataUrlPayload(dataUrl)
      const bytes = Uint8Array.from(atob(payload), (ch) => ch.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
      setPhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setPhotoName(photoFileName())
      setPhotoSize({ width, height })
      setPhase('shot')
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  return (
    <MultiPanel<CameraPhotoInput, CameraPhotoFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ maxSide: '1920' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {phase === 'idle' ? (
              <button
                type="button"
                data-testid="open-camera"
                className={SECONDARY_BUTTON}
                onClick={() => void handleOpen()}
              >
                打开摄像头
              </button>
            ) : null}
            {phase === 'preview' ? (
              <>
                <button
                  type="button"
                  data-testid="capture"
                  className={SECONDARY_BUTTON}
                  onClick={() => handleCapture(options)}
                >
                  拍照
                </button>
                <button
                  type="button"
                  data-testid="close-camera"
                  className={SECONDARY_BUTTON}
                  onClick={handleClose}
                >
                  关闭摄像头
                </button>
              </>
            ) : null}
            {phase === 'shot' ? (
              <button
                type="button"
                data-testid="retake"
                className={SECONDARY_BUTTON}
                onClick={() => setPhase('preview')}
              >
                重新拍照
              </button>
            ) : null}
          </div>
          {phase !== 'idle' ? (
            <video
              ref={videoRef}
              data-testid="preview"
              playsInline
              muted
              className={phase === 'shot' ? 'hidden' : 'w-full rounded'}
            />
          ) : null}
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {phase === 'shot' && photoUrl ? (
            <div className="flex flex-col gap-2">
              <img src={photoUrl} data-testid="photo" alt="拍摄的照片" className="w-full rounded" />
              <p data-testid="result-info" className="text-sm text-slate-700 dark:text-slate-300">
                拍照成功：{photoName}（{photoSize.width}×{photoSize.height}）
              </p>
              <div>
                <a
                  href={photoUrl}
                  download={photoName}
                  data-testid="download-photo"
                  className={SECONDARY_BUTTON}
                >
                  下载照片
                </a>
              </div>
            </div>
          ) : null}
          {phase === 'idle' && !error ? (
            <p className="text-sm text-slate-500">
              点「打开摄像头」并在浏览器提示中允许使用摄像头，预览画面后点「拍照」导出
              PNG。照片只在本地生成，不上传。
            </p>
          ) : null}
        </div>
      )}
      toText={() =>
        phase === 'shot' ? `拍照成功：${photoName}（${photoSize.width}×${photoSize.height}）` : ''
      }
      downloadExt="txt"
    />
  )
}
