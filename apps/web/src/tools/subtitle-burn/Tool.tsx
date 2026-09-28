import { useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { SubtitleBurnFormOptions, SubtitleBurnInput } from './schema'
import {
  BURN_POSITIONS,
  buildBurnArgs,
  burnFileName,
  cuesToSrt,
  normalizeSubtitles,
  type SubtitleCue,
} from './utils'

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,000
你好，欢迎使用字幕烧录工具。

2
00:00:05,000 --> 00:00:08,500
这条字幕会被烧录进视频画面。
`

/** 字幕位置的中文名（与 utils.BURN_POSITIONS 顺序对应） */
const POSITION_LABELS: Record<(typeof BURN_POSITIONS)[number], string> = {
  top: '顶部',
  middle: '中部',
  bottom: '底部',
}

/** 常用字体颜色预设 */
const COLOR_PRESETS = [
  { id: '#FFFFFF', label: '白色' },
  { id: '#FFFF00', label: '黄色' },
  { id: '#00FF00', label: '绿色' },
  { id: '#FF0000', label: '红色' },
] as const

type FFmpegInstance = {
  load: () => Promise<void>
  writeFile: (name: string, data: Uint8Array) => Promise<boolean>
  exec: (args: string[]) => Promise<number>
  readFile: (name: string) => Promise<Uint8Array>
  deleteFile: (name: string) => Promise<boolean>
}

let ffmpegPromise: Promise<FFmpegInstance> | null = null

/** 动态加载 ffmpeg.wasm（首屏不打包，打包体积友好） */
async function loadFFmpeg(): Promise<FFmpegInstance> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const mod = (await import('@ffmpeg/ffmpeg')) as unknown as {
        FFmpeg: new () => FFmpegInstance
      }
      const ffmpeg = new mod.FFmpeg()
      await ffmpeg.load()
      return ffmpeg
    })()
  }
  return ffmpegPromise
}

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '处理失败，请重试'
}

export default function Tool() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [cues, setCues] = useState<SubtitleCue[]>([])
  const [subtitleName, setSubtitleName] = useState('')
  const [fontSize, setFontSize] = useState('24')
  const [fontColor, setFontColor] = useState('#FFFFFF')
  const [positionId, setPositionId] = useState<(typeof BURN_POSITIONS)[number]>('bottom')
  const [resultUrl, setResultUrl] = useState('')
  const [resultName, setResultName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState('')
  const urlRef = useRef('')

  /** 读取字幕文件：SRT / VTT 自动识别，解析失败给中文提示 */
  async function handleSubtitleFile(file: File): Promise<void> {
    setError('')
    try {
      const text = await file.text()
      const parsed = normalizeSubtitles(text)
      setCues(parsed)
      setSubtitleName(file.name)
    } catch (err) {
      setCues([])
      setSubtitleName('')
      setError(toChineseError(err))
    }
  }

  /** 加载示例字幕，方便先看解析效果再上传视频 */
  function loadExampleSubtitle(): void {
    setError('')
    try {
      setCues(normalizeSubtitles(SAMPLE_SRT))
      setSubtitleName('示例字幕.srt')
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  /** 烧录：视频 + 字幕写入内存文件系统 → ffmpeg subtitles 滤镜 → 读出结果 */
  async function handleBurn(): Promise<void> {
    setError('')
    setResultUrl('')
    setPending(true)
    try {
      if (!videoFile) throw new Error('请先选择视频文件')
      if (cues.length === 0) throw new Error('请先选择字幕文件（SRT / VTT）')
      const opts = optionsSchema.parse({
        fontSize,
        fontColor,
        position: positionId,
      })

      setProgress('正在加载 ffmpeg.wasm（首次约需下载十几 MB）…')
      const ffmpeg = await loadFFmpeg()

      setProgress('正在写入视频与字幕…')
      const videoName = 'input.mp4'
      const srtName = 'subs.srt'
      const outName = 'output.mp4'
      await ffmpeg.writeFile(videoName, new Uint8Array(await videoFile.arrayBuffer()))
      await ffmpeg.writeFile(srtName, new TextEncoder().encode(cuesToSrt(cues)))

      setProgress('正在烧录字幕…')
      const args = buildBurnArgs(videoName, srtName, outName, {
        fontSize: opts.fontSize,
        fontColor: opts.fontColor,
        position: opts.position,
      })
      const code = await ffmpeg.exec(args)
      if (code !== 0) throw new Error(`ffmpeg 烧录失败（退出码 ${code}）`)

      const data = await ffmpeg.readFile(outName)
      const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' })
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setResultUrl(url)
      setResultName(burnFileName(videoFile.name))
      setProgress('')
      await ffmpeg.deleteFile(videoName).catch(() => false)
      await ffmpeg.deleteFile(srtName).catch(() => false)
      await ffmpeg.deleteFile(outName).catch(() => false)
    } catch (err) {
      setProgress('')
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  const cueDuration = cues.length > 0 ? Math.max(0, cues[cues.length - 1]!.end - cues[0]!.start) : 0

  return (
    <MultiPanel<SubtitleBurnInput, SubtitleBurnFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ fontSize: '24', fontColor: '#FFFFFF', position: 'bottom' }}
      renderOutput={(_input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 text-slate-600 dark:text-slate-400">视频文件</span>
              <input
                type="file"
                accept="video/*"
                data-testid="video-input"
                onChange={(e) => {
                  setVideoFile(e.target.files?.[0] ?? null)
                  setResultUrl('')
                }}
              />
            </label>
            {videoFile ? (
              <p data-testid="video-name" className="text-xs text-slate-500">
                已选择：{videoFile.name}（{(videoFile.size / 1024 / 1024).toFixed(2)} MB）
              </p>
            ) : null}
            <div className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 text-slate-600 dark:text-slate-400">字幕文件</span>
              <input
                type="file"
                accept=".srt,.vtt,text/plain"
                data-testid="subtitle-input"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleSubtitleFile(f)
                }}
              />
              <button
                type="button"
                data-testid="example-subtitle"
                className={SECONDARY_BUTTON}
                onClick={loadExampleSubtitle}
              >
                用示例字幕
              </button>
            </div>
            {cues.length > 0 ? (
              <p data-testid="subtitle-info" className="text-xs text-slate-500">
                {subtitleName}：解析出 {cues.length} 条字幕，覆盖时长 {cueDuration.toFixed(1)} 秒
              </p>
            ) : null}
          </div>

          <fieldset className="rounded border border-slate-200 p-2 dark:border-slate-700">
            <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              字幕样式
            </legend>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-1">
                字号
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="font-size"
                  className="w-16 rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-1">
                字体颜色
                <select
                  data-testid="font-color"
                  className="rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                >
                  {COLOR_PRESETS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                位置
                <select
                  data-testid="position"
                  className="rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value as (typeof BURN_POSITIONS)[number])}
                >
                  {BURN_POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {POSITION_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="burn"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
              disabled={pending || !videoFile || cues.length === 0}
              onClick={() => void handleBurn()}
            >
              {pending ? '烧录中…' : '烧录字幕'}
            </button>
            {pending && progress ? <p className="text-sm text-slate-500">{progress}</p> : null}
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

          {resultUrl ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500">烧录完成（{resultName}）：</p>
              <video
                data-testid="result-video"
                src={resultUrl}
                controls
                className="max-h-80 w-full rounded bg-black"
              >
                <track kind="captions" />
              </video>
              <a
                data-testid="download-link"
                href={resultUrl}
                download={resultName}
                className="text-sm text-brand underline"
              >
                下载烧录后的视频
              </a>
            </div>
          ) : null}

          {!resultUrl && !pending && !error ? (
            <p className="text-sm text-slate-500">
              烧录在本地浏览器完成（ffmpeg.wasm），视频不会上传。字幕统一转为 SRT 后烧录， VTT
              的特效样式会被简化为基本样式。
            </p>
          ) : null}
        </div>
      )}
      toText={() => (cues.length > 0 ? `字幕 ${subtitleName}：${cues.length} 条` : '')}
      downloadExt="txt"
    />
  )
}
