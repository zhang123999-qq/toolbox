import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { QrScanMediaFormOptions, QrScanMediaInput } from './schema'
import {
  buildScanReport,
  noCodeFoundMessage,
  normalizeJsqrResult,
  validateRgbaPixels,
} from './utils'
import type { JsqrResult } from './utils'

type JsqrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: string },
) => JsqrResult | null

export default function Tool() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<{ getTracks: () => { stop: () => void }[] } | null>(null)

  const optionDefs: readonly OptionDef<QrScanMediaFormOptions>[] = [
    {
      key: 'mode',
      label: '扫描来源',
      kind: 'select',
      values: ['camera', 'image'],
    },
  ]

  useEffect(() => {
    return () => stopStream()
  }, [])

  function stopStream(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
    setCameraOn(false)
  }

  /** 动态加载 jsqr：失败时给中文提示，不做静态导入 */
  async function loadJsqr(): Promise<JsqrFn> {
    try {
      const mod = await import('jsqr')
      const fn = (mod as unknown as { default: JsqrFn }).default
      if (typeof fn !== 'function') throw new Error('bad module')
      return fn
    } catch {
      throw new Error('二维码解码组件加载失败，请检查网络后重试')
    }
  }

  /** 从 canvas 取 RGBA 像素并用 jsqr 解码（纯流程，像素校验在 utils） */
  function decodeCanvas(canvas: HTMLCanvasElement, jsqr: JsqrFn): string | null {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('当前浏览器无法读取图像像素，请换用 Chrome / Edge 重试')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    validateRgbaPixels(imageData.width, imageData.height, imageData.data.length)
    const code = jsqr(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    })
    return normalizeJsqrResult(code)
  }

  function showText(text: string | null): void {
    if (text === null) {
      setError(noCodeFoundMessage())
      setResult('')
    } else {
      setResult(buildScanReport(text))
      setError('')
    }
  }

  /** 打开摄像头预览（实际扫描点「扫描当前画面」） */
  async function handleOpenCamera(): Promise<void> {
    setError('')
    const nav = navigator as Navigator & {
      mediaDevices?: { getUserMedia?: (c: unknown) => Promise<unknown> }
    }
    if (!nav.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持摄像头（缺少 getUserMedia），请使用最新版 Chrome / Edge / Firefox')
      return
    }
    try {
      const stream = (await nav.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })) as { getTracks: () => { stop: () => void }[] }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream as unknown as MediaStream
        await video.play().catch(() => undefined)
      }
      setCameraOn(true)
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? '摄像头权限被拒绝：请在浏览器地址栏允许本页面使用摄像头后重试'
          : '无法打开摄像头，请确认设备可用后重试',
      )
    }
  }

  /** 扫描当前摄像头画面 */
  async function handleScanCamera(): Promise<void> {
    setError('')
    setPending(true)
    try {
      const video = videoRef.current
      if (!video || video.videoWidth === 0) throw new Error('摄像头画面尚未就绪，请稍候再试')
      const jsqr = await loadJsqr()
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('当前浏览器无法读取图像像素，请换用 Chrome / Edge 重试')
      ctx.drawImage(video, 0, 0)
      showText(decodeCanvas(canvas, jsqr))
    } catch (err) {
      setError(err instanceof Error ? err.message : '扫描失败，请重试')
      setResult('')
    } finally {
      setPending(false)
    }
  }

  /** 上传图片并扫描 */
  function handleImage(file: File): void {
    setError('')
    setResult('')
    setPending(true)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      void (async () => {
        try {
          const jsqr = await loadJsqr()
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('当前浏览器无法读取图像像素，请换用 Chrome / Edge 重试')
          ctx.drawImage(img, 0, 0)
          showText(decodeCanvas(canvas, jsqr))
        } catch (err) {
          setError(err instanceof Error ? err.message : '扫描失败，请重试')
          setResult('')
        } finally {
          setPending(false)
          URL.revokeObjectURL(url)
        }
      })()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setPending(false)
      setError('图片加载失败：文件可能已损坏')
    }
    img.src = url
  }

  return (
    <MultiPanel<QrScanMediaInput, QrScanMediaFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'camera' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          {options.mode === 'camera' ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {!cameraOn ? (
                  <button
                    type="button"
                    data-testid="open-camera"
                    className={SECONDARY_BUTTON}
                    onClick={() => void handleOpenCamera()}
                  >
                    打开摄像头
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      data-testid="scan-camera"
                      className={SECONDARY_BUTTON}
                      disabled={pending}
                      onClick={() => void handleScanCamera()}
                    >
                      {pending ? '扫描中…' : '扫描当前画面'}
                    </button>
                    <button
                      type="button"
                      data-testid="close-camera"
                      className={SECONDARY_BUTTON}
                      onClick={stopStream}
                    >
                      关闭摄像头
                    </button>
                  </>
                )}
              </div>
              <video
                ref={videoRef}
                data-testid="preview"
                playsInline
                muted
                className="w-full rounded bg-black"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label className={SECONDARY_BUTTON} htmlFor="qr-scan-media-file">
                选择二维码图片
              </label>
              <input
                id="qr-scan-media-file"
                type="file"
                accept="image/*"
                data-testid="file"
                className="hidden"
                onChange={(event) => {
                  const f = event.target.files?.[0]
                  if (f) handleImage(f)
                  event.target.value = ''
                }}
              />
            </div>
          )}
          {pending ? <p className="text-sm text-slate-500">处理中…</p> : null}
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
            <p
              data-testid="result-info"
              className="whitespace-pre-line break-all text-sm text-slate-700 dark:text-slate-300"
            >
              {result}
            </p>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              本工具是二维码「扫描识别」器（解码），与「二维码生成」器不重复。摄像头模式请把二维码置于画面中央后点「扫描当前画面」；图片模式直接上传含二维码的图片。全程本地解码，不上传。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result}
      downloadExt="txt"
    />
  )
}
