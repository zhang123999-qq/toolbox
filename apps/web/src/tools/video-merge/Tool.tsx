import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { VideoMergeFormOptions, VideoMergeInput } from './schema'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import {
  buildConcatList,
  buildMergeArgs,
  buildMergeReport,
  formatBytes,
  mergeFileName,
  validateFileList,
  validateFileSizes,
} from './utils'

interface DoneResult {
  readonly fileName: string
  readonly report: string
  readonly bytes: number
}

export default function Tool() {
  const [fileNames, setFileNames] = useState<readonly string[]>([])
  const [resultUrl, setResultUrl] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [phase, setPhase] = useState('')

  const optionDefs: readonly OptionDef<VideoMergeFormOptions>[] = [
    { key: 'reencode', label: '重编码统一（H.264+AAC；编码不一致时必开）', kind: 'boolean' },
  ]

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '处理失败，请重试'
  }

  function handleFiles(list: FileList | null): void {
    setError('')
    setResult(null)
    if (!list || list.length === 0) return
    setFileNames(Array.from(list, (f) => f.name))
  }

  /** 从 input 元素取回用户选择的文件（不重新选文件即可再次合并） */
  function pickFilesAgain(): File[] {
    const input = document.getElementById('video-merge-file') as HTMLInputElement | null
    const files = input?.files ? Array.from(input.files) : []
    if (files.length === 0) throw new Error('找不到已选择的视频文件，请重新选择')
    return files
  }

  async function handleMerge(raw: VideoMergeFormOptions): Promise<void> {
    setError('')
    setResult(null)
    setPending(true)
    try {
      const files = pickFilesAgain()
      validateFileList(files.length)
      validateFileSizes(files.map((f) => f.size))
      setPhase('正在加载视频编码组件…')
      let FFmpegCtor: typeof FFmpeg
      try {
        const mod = await import('@ffmpeg/ffmpeg')
        FFmpegCtor = mod.FFmpeg
      } catch {
        throw new Error('视频编码组件加载失败，请检查网络后重试')
      }
      const ffmpeg = new FFmpegCtor()
      try {
        await ffmpeg.load()
      } catch {
        throw new Error('视频编码组件初始化失败，请检查网络后重试')
      }
      const virtualNames = files.map((f, i) => `part-${i}-${sanitizeName(f.name)}`)
      setPhase('正在写入输入文件…')
      for (let i = 0; i < files.length; i++) {
        await ffmpeg.writeFile(virtualNames[i]!, new Uint8Array(await files[i]!.arrayBuffer()))
      }
      const listName = 'concat-list.txt'
      await ffmpeg.writeFile(listName, new TextEncoder().encode(buildConcatList(virtualNames)))
      const outName = 'output-merged.mp4'
      setPhase('正在拼接视频…')
      const code = await ffmpeg.exec(buildMergeArgs(listName, outName, raw.reencode))
      if (code !== 0) {
        throw new Error(
          raw.reencode
            ? `视频合并失败（退出码 ${code}），请检查输入文件是否损坏`
            : `视频合并失败（退出码 ${code}）：多为编码不一致导致，请开启「重编码统一」后重试`,
        )
      }
      const fileData = await ffmpeg.readFile(outName)
      if (typeof fileData === 'string') throw new Error('读取输出文件失败：数据类型异常')
      const data = Uint8Array.from(fileData)
      for (const name of [...virtualNames, listName, outName]) {
        await ffmpeg.deleteFile(name).catch(() => undefined)
      }
      const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }))
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      const report = buildMergeReport(
        files.map((f) => f.name),
        raw.reencode,
        data.length,
      )
      setResult({ fileName: mergeFileName(), report, bytes: data.length })
    } catch (err) {
      setError(toChineseError(err))
      setResult(null)
    } finally {
      setPending(false)
      setPhase('')
    }
  }

  return (
    <MultiPanel<VideoMergeInput, VideoMergeFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ reencode: true }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={SECONDARY_BUTTON} htmlFor="video-merge-file">
              选择多个视频（按选择顺序拼接）
            </label>
            <input
              id="video-merge-file"
              type="file"
              accept="video/*"
              multiple
              data-testid="file"
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <button
              type="button"
              data-testid="merge"
              className={SECONDARY_BUTTON}
              disabled={pending}
              onClick={() => void handleMerge(options)}
            >
              {pending ? '处理中…' : '开始合并'}
            </button>
          </div>
          {fileNames.length > 0 ? (
            <ol
              data-testid="file-list"
              className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400"
            >
              {fileNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ol>
          ) : null}
          {pending && phase ? <p className="text-sm text-slate-500">{phase}</p> : null}
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
              <video controls src={resultUrl} data-testid="player" className="w-full">
                <track kind="captions" />
              </video>
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
                  data-testid="download-video"
                  className={SECONDARY_BUTTON}
                >
                  下载视频（{formatBytes(result.bytes)}）
                </a>
              </div>
            </div>
          ) : null}
          {!result && !pending && !error ? (
            <p className="text-sm text-slate-500">
              按住 Ctrl / Shift
              多选视频，列表顺序即拼接顺序；各视频编码不一致时请开启「重编码统一」。全程本地处理，不上传文件。
            </p>
          ) : null}
        </div>
      )}
      toText={() => result?.report ?? ''}
      downloadExt="txt"
    />
  )
}

/** 虚拟文件名消毒：只保留字母数字与常见符号，避免 concat 列表解析问题 */
function sanitizeName(name: string): string {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  return `${safe === '' ? 'part' : safe}${ext === '' ? '.mp4' : ext}`
}
