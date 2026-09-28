import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { SubtitleMergeFormOptions, SubtitleMergeInput } from './schema'
import { MERGE_FORMATS, mergeSubtitles } from './utils'
import type { MergeFile, MergeResult } from './utils'

/** 单文件上限 20 MiB（字幕文本文件都很小） */
const MAX_FILE_BYTES = 20 * 1024 * 1024

/** 示例字幕 A：SRT */
const EXAMPLE_A = `1
00:00:01,000 --> 00:00:04,000
你好，世界

2
00:00:05,000 --> 00:00:08,000
这是第一份字幕
`

/** 示例字幕 B：VTT，与 A 有时间重叠 */
const EXAMPLE_B = `WEBVTT

00:00:03.000 --> 00:00:06.000
这是第二份字幕（与第一份重叠）

00:00:10.000 --> 00:00:12.000
这是第二份字幕的第二条
`

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '合并失败，请重试'
}

/** 合并统计 → 中文报告 */
function statsReport(result: MergeResult): string {
  const s = result.stats
  return [
    `参与文件：${s.fileCount} 个，共解析 ${s.totalParsed} 条`,
    `合并后：${s.merged} 条`,
    `去重：${s.droppedDuplicates} 条 去重叠修正：${s.trimmedOverlaps} 条 丢弃空条目：${s.droppedEmpty} 条`,
  ].join('\n')
}

export default function Tool() {
  const [files, setFiles] = useState<readonly MergeFile[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const optionDefs: readonly OptionDef<SubtitleMergeFormOptions>[] = [
    { key: 'format', label: '输出格式', kind: 'select', values: [...MERGE_FORMATS] },
    { key: 'offsetMs', label: '时间轴偏移（毫秒，可为负）', kind: 'text', placeholder: '0' },
  ]

  /** 读取选择的字幕文件（可多选） */
  async function handleFiles(list: FileList | null): Promise<void> {
    if (!list || list.length === 0) return
    setError('')
    setPending(true)
    try {
      const arr = [...list]
      for (const f of arr) {
        if (f.size > MAX_FILE_BYTES) {
          throw new Error(`文件「${f.name}」过大：超过 20 MiB 上限`)
        }
      }
      const texts = await Promise.all(arr.map((f) => f.text()))
      setFiles((prev) => [...prev, ...arr.map((f, i) => ({ name: f.name, text: texts[i] ?? '' }))])
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  /** 纯计算：文件 + 粘贴文本 → 合并结果；失败返回错误文案 */
  function compute(
    input: SubtitleMergeInput,
    options: SubtitleMergeFormOptions,
  ): { ok: true; result: MergeResult; ext: string } | { ok: false; error: string } {
    try {
      const opts = optionsSchema.parse(options)
      const all: MergeFile[] = [...files]
      if (input.text.trim() !== '') all.push({ name: '粘贴的字幕', text: input.text })
      const result = mergeSubtitles(all, opts.offsetMs, opts.format)
      return { ok: true, result, ext: opts.format }
    } catch (err) {
      return { ok: false, error: toChineseError(err) }
    }
  }

  return (
    <MultiPanel<SubtitleMergeInput, SubtitleMergeFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'srt', offsetMs: '0' }}
      optionDefs={optionDefs}
      example={{ text: EXAMPLE_A }}
      renderOutput={(input, options) => {
        const r = compute(input, options)
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className={SECONDARY_BUTTON} htmlFor="subtitle-merge-file">
                选择字幕文件（可多选）
              </label>
              <input
                id="subtitle-merge-file"
                type="file"
                accept=".srt,.vtt,.ass,.ssa,.txt,text/plain"
                multiple
                data-testid="file"
                className="hidden"
                onChange={(event) => {
                  void handleFiles(event.target.files)
                  event.target.value = ''
                }}
              />
              <button
                type="button"
                data-testid="example-files"
                className={SECONDARY_BUTTON}
                onClick={() => {
                  setError('')
                  setFiles([
                    { name: '示例A.srt', text: EXAMPLE_A },
                    { name: '示例B.vtt', text: EXAMPLE_B },
                  ])
                }}
              >
                载入示例字幕
              </button>
              {files.length > 0 ? (
                <button
                  type="button"
                  data-testid="clear-files"
                  className={SECONDARY_BUTTON}
                  onClick={() => setFiles([])}
                >
                  清空文件（{files.length}）
                </button>
              ) : null}
            </div>
            {files.length > 0 ? (
              <p data-testid="file-list" className="text-sm text-slate-600 dark:text-slate-400">
                已选择：{files.map((f) => f.name).join('、')}
              </p>
            ) : null}
            {pending ? <p className="text-sm text-slate-500">读取中…</p> : null}
            {!r.ok ? (
              <div
                role="alert"
                data-testid="error"
                className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                {r.error}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <pre
                  data-testid="result-text"
                  className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
                >
                  {r.result.output}
                </pre>
                <p
                  data-testid="result-info"
                  className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400"
                >
                  {statsReport(r.result)}
                </p>
                <div>
                  <button
                    type="button"
                    data-testid="download-result"
                    className={SECONDARY_BUTTON}
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([r.result.output], { type: 'text/plain;charset=utf-8' }),
                      )
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `merged.${r.ext}`
                      a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 1000)
                    }}
                  >
                    下载合并结果（.{r.ext}）
                  </button>
                </div>
              </div>
            )}
            {error && r.ok ? (
              <div
                role="alert"
                data-testid="file-error"
                className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                {error}
              </div>
            ) : null}
          </div>
        )
      }}
      toText={(input, options) => {
        const r = compute(input, options)
        return r.ok ? r.result.output : r.error
      }}
      downloadExt="txt"
    />
  )
}
