import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { MediaMetadataFormOptions, MediaMetadataInput } from './schema'
import {
  buildMetadataReport,
  detectMediaKind,
  formatBitrate,
  formatBytes,
  formatDuration,
  mediaKindLabel,
  parseMp3Info,
  parseMp4Info,
  parseWavInfo,
} from './utils'
import type { MediaKind } from './utils'

/** 只读文件头部用于解析（MP4 的 moov 可能在文件尾，读前 8 MiB 兜底） */
const HEAD_BYTES = 8 * 1024 * 1024

export default function Tool() {
  const [fileName, setFileName] = useState('')
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  /** 浏览器兜底：用 audio/video 元素探测时长（纯 JS 解析读不到时） */
  function probeDurationByElement(file: File, kind: MediaKind): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const el = document.createElement(kind === 'mp4' || kind === 'webm' ? 'video' : 'audio')
      const done = (value: number | null) => {
        URL.revokeObjectURL(url)
        resolve(value)
      }
      el.preload = 'metadata'
      el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null)
      el.onerror = () => done(null)
      window.setTimeout(() => done(null), 15000)
      el.src = url
    })
  }

  async function handleFile(file: File): Promise<void> {
    setError('')
    setReport('')
    setPending(true)
    try {
      setFileName(file.name)
      const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer())
      const kind = detectMediaKind(head)
      const rows: Array<readonly [string, string]> = [
        ['文件名', file.name],
        ['文件大小', formatBytes(file.size)],
        ['容器格式', mediaKindLabel(kind)],
      ]
      if (kind === 'wav') {
        const info = parseWavInfo(head)
        rows.push(
          ['采样率', `${info.sampleRate} Hz`],
          ['声道数', `${info.channels}`],
          ['位深', `${info.bitsPerSample} bit`],
          ['时长', formatDuration(info.durationSec)],
          ['音频数据', formatBytes(info.dataBytes)],
        )
      } else if (kind === 'mp3') {
        const info = parseMp3Info(head)
        rows.push(
          ['MPEG 版本', info.mpegVersion],
          ['编码层', 'Layer III'],
          ['码率', formatBitrate(info.bitrateKbps)],
          ['采样率', `${info.sampleRateHz} Hz`],
          ['声道数', `${info.channels}`],
        )
        const probed = await probeDurationByElement(file, kind)
        rows.push(['时长', formatDuration(probed)])
      } else if (kind === 'mp4') {
        const info = parseMp4Info(head)
        rows.push(['主品牌', info.majorBrand || '未知'])
        let duration = info.durationSec
        if (duration === null) duration = await probeDurationByElement(file, kind)
        rows.push(['时长', formatDuration(duration)])
        rows.push([
          '分辨率',
          info.width !== null && info.height !== null ? `${info.width}×${info.height}` : '未知',
        ])
      } else if (kind === 'webm' || kind === 'ogg' || kind === 'flac') {
        const probed = await probeDurationByElement(file, kind)
        rows.push(['时长', formatDuration(probed)])
        rows.push(['说明', '该容器暂只做文件头识别，详细编码信息请用浏览器播放器查看'])
      } else {
        throw new Error('无法识别的文件格式：不是受支持的音视频文件头')
      }
      setReport(buildMetadataReport(rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请重试')
      setReport('')
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<MediaMetadataInput, MediaMetadataFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="media-metadata-file">
              选择音视频文件
            </label>
            <input
              id="media-metadata-file"
              type="file"
              accept="audio/*,video/*"
              data-testid="file"
              className="hidden"
              onChange={(event) => {
                const f = event.target.files?.[0]
                if (f) void handleFile(f)
                event.target.value = ''
              }}
            />
            {fileName ? (
              <span data-testid="file-name" className="text-sm text-slate-600 dark:text-slate-400">
                {fileName}
              </span>
            ) : null}
          </div>
          {pending ? <p className="text-sm text-slate-500">解析中…</p> : null}
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {report ? (
            <p
              data-testid="result-info"
              className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300"
            >
              {report}
            </p>
          ) : null}
          {!report && !pending && !error ? (
            <p className="text-sm text-slate-500">
              选择音视频文件，本地解析文件头得出格式、时长、编码、分辨率、码率等信息（只读文件头部，不上传；部分时长用浏览器解码兜底探测）。
            </p>
          ) : null}
        </div>
      )}
      toText={() => report}
      downloadExt="txt"
    />
  )
}
