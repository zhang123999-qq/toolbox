import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { SrtConvertFormOptions, SrtConvertInput } from './schema'
import { SRT_TARGETS, convertSrt } from './utils'

/** 示例 SRT：两条字幕 */
const EXAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,000
你好，世界

2
00:00:05,500 --> 00:00:08,000
这是第二行字幕
支持多行文本
`

/** 目标格式 → 下载文件扩展名 */
function targetExt(target: string): string {
  switch (target) {
    case 'vtt':
      return 'vtt'
    case 'txt':
      return 'txt'
    case 'json':
      return 'json'
    default:
      return 'srt'
  }
}

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '转换失败，请重试'
}

/** 纯计算：SRT 文本 → 目标格式；失败返回错误文案（renderOutput 内不抛错） */
function compute(
  input: SrtConvertInput,
  options: SrtConvertFormOptions,
): { ok: true; text: string; ext: string } | { ok: false; error: string } {
  try {
    const opts = optionsSchema.parse(options)
    const out = convertSrt(input.text, opts.target, opts.offsetMs)
    return { ok: true, text: out, ext: targetExt(opts.target) }
  } catch (err) {
    return { ok: false, error: toChineseError(err) }
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<SrtConvertFormOptions>[] = [
    { key: 'target', label: '目标格式', kind: 'select', values: [...SRT_TARGETS] },
    { key: 'offsetMs', label: '时间轴偏移（毫秒，可为负）', kind: 'text', placeholder: '0' },
  ]

  return (
    <MultiPanel<SrtConvertInput, SrtConvertFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ target: 'vtt', offsetMs: '0' }}
      optionDefs={optionDefs}
      example={{ text: EXAMPLE_SRT }}
      renderOutput={(input, options) => {
        const r = compute(input, options)
        if (!r.ok) {
          return (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {r.error}
            </div>
          )
        }
        return (
          <div className="flex flex-col gap-2">
            <pre
              data-testid="result-text"
              className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
            >
              {r.text}
            </pre>
            <div>
              <button
                type="button"
                data-testid="download-result"
                className={SECONDARY_BUTTON}
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([r.text], { type: 'text/plain;charset=utf-8' }),
                  )
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `subtitle.${r.ext}`
                  a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 1000)
                }}
              >
                下载转换结果（.{r.ext}）
              </button>
            </div>
          </div>
        )
      }}
      toText={(input, options) => {
        const r = compute(input, options)
        return r.ok ? r.text : r.error
      }}
      downloadExt="txt"
    />
  )
}
