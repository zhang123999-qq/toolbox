import { useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { SegmentForm, VideoEditorFormOptions, VideoEditorInput } from './schema'
import {
  addSegment,
  buildConcatArgs,
  buildConcatListFile,
  buildTrimArgs,
  editorFileName,
  formatClock,
  moveSegment,
  parseTimeInput,
  removeSegment,
  tempSegmentName,
  totalDuration,
  validateSegmentAgainstDuration,
  type Segment,
} from './utils'

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
  const [previewUrl, setPreviewUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [segments, setSegments] = useState<Segment[]>([])
  const [form, setForm] = useState<SegmentForm>({ start: '', end: '' })
  const [resultUrl, setResultUrl] = useState('')
  const [resultName, setResultName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState('')
  const urlRef = useRef('')

  /** 选择视频：生成预览 URL，读取元数据后记录总时长（供片段越界校验） */
  function handleVideoFile(file: File): void {
    setVideoFile(file)
    setResultUrl('')
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(file)
    urlRef.current = url
    setPreviewUrl(url)
    setDuration(0)
    setError('')
  }

  function setField(key: keyof SegmentForm, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /** 添加片段：解析时间 → 校验范围 → 校验不超出视频总时长 → 追加 */
  function handleAddSegment(): void {
    setError('')
    try {
      const start = parseTimeInput(form.start)
      const end = parseTimeInput(form.end)
      const next = addSegment(segments, start, end)
      const created = next[next.length - 1]!
      validateSegmentAgainstDuration(created, duration)
      setSegments(next)
      setForm({ start: '', end: '' })
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  function handleRemove(id: string): void {
    setError('')
    try {
      setSegments(removeSegment(segments, id))
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  function handleMove(id: string, delta: -1 | 1): void {
    setError('')
    try {
      setSegments(moveSegment(segments, id, delta))
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  /**
   * 导出：逐个片段流拷贝裁剪 → concat demuxer 拼接 → 读出结果。
   * 注：流拷贝裁剪只能切到关键帧，毫秒级精度需要重编码（本工具未做）。
   */
  async function handleExport(): Promise<void> {
    setError('')
    setResultUrl('')
    setPending(true)
    const tempNames: string[] = []
    try {
      if (!videoFile) throw new Error('请先选择视频文件')
      if (segments.length === 0) throw new Error('请先添加至少一个片段')

      setProgress('正在加载 ffmpeg.wasm（首次约需下载十几 MB）…')
      const ffmpeg = await loadFFmpeg()

      setProgress('正在写入视频…')
      const inputName = 'input.mp4'
      await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()))

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!
        const tempName = tempSegmentName(i)
        tempNames.push(tempName)
        setProgress(`正在裁剪片段 ${i + 1}/${segments.length}…`)
        const code = await ffmpeg.exec(buildTrimArgs(inputName, seg.start, seg.end, tempName))
        if (code !== 0) throw new Error(`片段 ${i + 1} 裁剪失败（退出码 ${code}）`)
      }

      setProgress('正在拼接片段…')
      const listName = 'concat.txt'
      await ffmpeg.writeFile(listName, new TextEncoder().encode(buildConcatListFile(tempNames)))
      const outName = 'output.mp4'
      const concatCode = await ffmpeg.exec(buildConcatArgs(listName, outName))
      if (concatCode !== 0) throw new Error(`拼接失败（退出码 ${concatCode}）`)

      const data = await ffmpeg.readFile(outName)
      const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' })
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setResultUrl(url)
      setResultName(editorFileName(videoFile.name))
      setProgress('')
      await ffmpeg.deleteFile(inputName).catch(() => false)
      await ffmpeg.deleteFile(listName).catch(() => false)
      await ffmpeg.deleteFile(outName).catch(() => false)
      for (const name of tempNames) await ffmpeg.deleteFile(name).catch(() => false)
    } catch (err) {
      setProgress('')
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<VideoEditorInput, VideoEditorFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
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
                  const f = e.target.files?.[0]
                  if (f) handleVideoFile(f)
                }}
              />
            </label>
            {previewUrl ? (
              <video
                data-testid="video-preview"
                src={previewUrl}
                controls
                className="max-h-60 w-full rounded bg-black"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              >
                <track kind="captions" />
              </video>
            ) : null}
            {videoFile ? (
              <p data-testid="video-info" className="text-xs text-slate-500">
                {videoFile.name}
                {duration > 0 ? ` · 总时长 ${formatClock(duration)}` : ' · 正在读取时长…'}
              </p>
            ) : null}
          </div>

          <fieldset className="rounded border border-slate-200 p-2 dark:border-slate-700">
            <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              添加片段（支持 90 / 1:30 / 01:02:03 三种写法）
            </legend>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-1">
                开始
                <input
                  type="text"
                  data-testid="seg-start"
                  className="w-24 rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="0:00"
                  value={form.start}
                  onChange={(e) => setField('start', e.target.value)}
                />
              </label>
              <label className="flex items-center gap-1">
                结束
                <input
                  type="text"
                  data-testid="seg-end"
                  className="w-24 rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="0:10"
                  value={form.end}
                  onChange={(e) => setField('end', e.target.value)}
                />
              </label>
              <button
                type="button"
                data-testid="seg-add"
                className={SECONDARY_BUTTON}
                onClick={handleAddSegment}
              >
                添加片段
              </button>
            </div>
          </fieldset>

          {segments.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500">
                片段列表（共 {segments.length} 段，合计 {formatClock(totalDuration(segments))}，
                按列表顺序拼接）：
              </p>
              <ol data-testid="segment-list" className="flex flex-col gap-1">
                {segments.map((seg, i) => (
                  <li
                    key={seg.id}
                    data-testid={`segment-${seg.id}`}
                    className="flex items-center gap-2 rounded border border-slate-200 p-1.5 text-sm dark:border-slate-700"
                  >
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      #{i + 1} {formatClock(seg.start)} → {formatClock(seg.end)}
                    </span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      className={SECONDARY_BUTTON}
                      onClick={() => handleMove(seg.id, -1)}
                      disabled={i === 0}
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      className={SECONDARY_BUTTON}
                      onClick={() => handleMove(seg.id, 1)}
                      disabled={i === segments.length - 1}
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      className={SECONDARY_BUTTON}
                      onClick={() => handleRemove(seg.id)}
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="export"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
              disabled={pending || !videoFile || segments.length === 0}
              onClick={() => void handleExport()}
            >
              {pending ? '导出中…' : '导出视频'}
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
              <p className="text-xs text-slate-500">导出完成（{resultName}）：</p>
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
                下载剪辑后的视频
              </a>
            </div>
          ) : null}

          {!resultUrl && !pending && !error ? (
            <p className="text-sm text-slate-500">
              剪辑在本地浏览器完成（ffmpeg.wasm），视频不会上传。采用流拷贝裁剪与拼接，
              速度快但只能切到关键帧，毫秒级精度需求请使用专业剪辑软件。
            </p>
          ) : null}
        </div>
      )}
      toText={() =>
        segments
          .map((s, i) => `#${i + 1} ${formatClock(s.start)} → ${formatClock(s.end)}`)
          .join('\n')
      }
      downloadExt="txt"
    />
  )
}
