import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { AssConvertFormOptions, AssConvertInput } from './schema'
import { ASS_TARGETS, convertAss } from './utils'

/** 示例 ASS：含样式段与两条对话 */
const EXAMPLE_ASS = `[Script Info]
Title: 示例字幕
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour
Style: Default,Arial,20,&H00FFFFFF

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,你好，世界
Dialogue: 0,0:00:05.50,0:00:08.00,Default,,0,0,0,,第二行字幕
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
    case 'ass':
      return 'ass'
    default:
      return 'srt'
  }
}

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '转换失败，请重试'
}

/** 纯计算：ASS 文本 → 目标格式；失败返回错误文案（renderOutput 内不抛错） */
function compute(
  input: AssConvertInput,
  options: AssConvertFormOptions,
): { ok: true; text: string; ext: string } | { ok: false; error: string } {
  try {
    const opts = optionsSchema.parse(options)
    const out = convertAss(input.text, opts.target, opts.offsetMs, opts.keepStyles)
    return { ok: true, text: out, ext: targetExt(opts.target) }
  } catch (err) {
    return { ok: false, error: toChineseError(err) }
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<AssConvertFormOptions>[] = [
    { key: 'target', label: '目标格式', kind: 'select', values: [...ASS_TARGETS] },
    { key: 'offsetMs', label: '时间轴偏移（毫秒，可为负）', kind: 'text', placeholder: '0' },
    { key: 'keepStyles', label: 'ASS 输出时保留样式段', kind: 'boolean' },
  ]

  return (
    <MultiPanel<AssConvertInput, AssConvertFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ target: 'srt', offsetMs: '0', keepStyles: true }}
      optionDefs={optionDefs}
      example={{ text: EXAMPLE_ASS }}
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
