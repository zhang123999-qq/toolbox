import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { BarcodeScanMediaFormOptions, BarcodeScanMediaInput } from './schema'
import {
  buildScanReport,
  isNotFoundError,
  noCodeFoundMessage,
  normalizeDecodeResult,
} from './utils'
import type { ZxingDecodeResult } from './utils'

/** ZXing BrowserMultiFormatReader 的最小形状（只取用到的两个方法） */
interface ZxingReader {
  decodeFromImageUrl: (url: string) => Promise<{
    getText: () => string
    getBarcodeFormat: () => { toString: () => string }
  }>
  decodeFromVideoElement: (
    video: HTMLVideoElement,
    callback: (
      result:
        { getText: () => string; getBarcodeFormat: () => { toString: () => string } } | undefined,
      err: unknown,
    ) => void,
  ) => { stop: () => void } | void
  reset: () => void
}

export default function Tool() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<ZxingReader | null>(null)

  const optionDefs: readonly OptionDef<BarcodeScanMediaFormOptions>[] = [
    {
      key: 'mode',
      label: '扫描来源',
      kind: 'select',
      values: ['camera', 'image'],
    },
  ]

  useEffect(() => {
    return () => stopCameraScan()
  }, [])

  /** 动态加载 @zxing/browser：失败时给中文提示，不做静态导入 */
  async function loadReader(): Promise<ZxingReader> {
    try {
      const mod = await import('@zxing/browser')
      const Ctor = (mod as unknown as { BrowserMultiFormatReader: new () => ZxingReader })
        .BrowserMultiFormatReader
      if (typeof Ctor !== 'function') throw new Error('bad module')
      return new Ctor()
    } catch {
      throw new Error('条码解码组件加载失败，请检查网络后重试')
    }
  }

  function stopCameraScan(): void {
    try {
      readerRef.current?.reset()
    } catch {
      /* 忽略清理时的异常 */
    }
    readerRef.current = null
    setScanning(false)
  }

  function showDecoded(raw: ZxingDecodeResult | null | undefined): void {
    const normalized = normalizeDecodeResult(raw)
    if (normalized === null) {
      setError(noCodeFoundMessage())
      setResult('')
    } else {
      setResult(buildScanReport(normalized.text, normalized.formatLabel))
      setError('')
    }
  }

  /** 摄像头连续扫描：首个有效结果即停止 */
  async function handleScanCamera(): Promise<void> {
    setError('')
    setResult('')
    setPending(true)
    try {
      const video = videoRef.current
      if (!video) throw new Error('预览元素未就绪，请刷新页面后重试')
      const reader = await loadReader()
      readerRef.current = reader
      setScanning(true)
      setPending(false)
      reader.decodeFromVideoElement(video, (decoded, err) => {
        if (decoded) {
          const raw: ZxingDecodeResult = {
            text: decoded.getText(),
            formatName: decoded.getBarcodeFormat().toString(),
          }
          stopCameraScan()
          showDecoded(raw)
        } else if (err && !isNotFoundError(err)) {
          stopCameraScan()
          setError(err instanceof Error ? `扫描出错：${err.message}` : '扫描出错，请重试')
        }
        // NotFound 类错误表示当前帧没扫到，继续下一帧
      })
    } catch (err) {
      setPending(false)
      setScanning(false)
      setError(err instanceof Error ? err.message : '扫描失败，请重试')
    }
  }

  /** 上传图片并解码 */
  async function handleImage(file: File): Promise<void> {
    setError('')
    setResult('')
    setPending(true)
    const url = URL.createObjectURL(file)
    try {
      const reader = await loadReader()
      const decoded = await reader.decodeFromImageUrl(url)
      showDecoded({
        text: decoded.getText(),
        formatName: decoded.getBarcodeFormat().toString(),
      })
    } catch (err) {
      if (isNotFoundError(err)) {
        setError(noCodeFoundMessage())
      } else {
        setError(err instanceof Error ? `图片解码失败：${err.message}` : '图片解码失败，请重试')
      }
      setResult('')
    } finally {
      setPending(false)
      URL.revokeObjectURL(url)
    }
  }

  return (
    <MultiPanel<BarcodeScanMediaInput, BarcodeScanMediaFormOptions>
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
                {!scanning ? (
                  <button
                    type="button"
                    data-testid="scan-camera"
                    className={SECONDARY_BUTTON}
                    disabled={pending}
                    onClick={() => void handleScanCamera()}
                  >
                    {pending ? '加载中…' : '开始摄像头扫描'}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="stop-scan"
                    className={SECONDARY_BUTTON}
                    onClick={stopCameraScan}
                  >
                    停止扫描
                  </button>
                )}
              </div>
              <video
                ref={videoRef}
                data-testid="preview"
                playsInline
                muted
                className="w-full rounded bg-black"
              />
              {scanning ? (
                <p className="text-sm text-slate-500">扫描中…把条码对准画面，识别到后会自动停止</p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label className={SECONDARY_BUTTON} htmlFor="barcode-scan-media-file">
                选择条码图片
              </label>
              <input
                id="barcode-scan-media-file"
                type="file"
                accept="image/*"
                data-testid="file"
                className="hidden"
                onChange={(event) => {
                  const f = event.target.files?.[0]
                  if (f) void handleImage(f)
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
          {!result && !pending && !error && !scanning ? (
            <p className="text-sm text-slate-500">
              本工具是一维条码 /
              二维码「扫描识别」器（解码），与「条码生成」器不重复。摄像头模式点「开始摄像头扫描」后把条码对准画面；图片模式直接上传含条码的图片。全程本地解码，不上传。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result}
      downloadExt="txt"
    />
  )
}
