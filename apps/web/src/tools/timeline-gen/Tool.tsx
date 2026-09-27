import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { EXAMPLES, MAX_EVENTS, buildTimelineHtml, parseEvents } from './utils'
import type { TimelineGenInput, TimelineGenOptions } from './schema'

/** 「示例」按钮填入的示例：产品发布史 */
const EXAMPLE: TimelineGenInput = { text: EXAMPLES[0] }

/** 截断提示条样式 */
const NOTICE_CLASS =
  'mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'

/** 错误提示样式 */
const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

/** 引导提示样式 */
const HINT_CLASS = 'text-sm text-slate-500 dark:text-slate-400'

/** unknown → 可展示的错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TimelineGenOptions>[] = [
    {
      key: 'direction',
      label: t('timelineGen.direction'),
      kind: 'select',
      values: ['vertical', 'horizontal'],
    },
    { key: 'showGap', label: t('timelineGen.showGap'), kind: 'boolean' },
  ]

  return (
    <MultiPanel<TimelineGenInput, TimelineGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'vertical', showGap: true }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => {
        let parsed
        try {
          parsed = parseEvents(input.text, t)
        } catch (error) {
          return (
            <p role="alert" data-testid="timeline-error" className={ERROR_CLASS}>
              {messageOf(error)}
            </p>
          )
        }
        if (parsed.events.length === 0) {
          return <p className={HINT_CLASS}>{t('timelineGen.preview.empty')}</p>
        }
        return (
          <div>
            {parsed.truncated ? (
              <p data-testid="timeline-truncated" className={NOTICE_CLASS}>
                {t('timelineGen.notice.truncated', { max: MAX_EVENTS })}
              </p>
            ) : null}
            <div
              data-testid="timeline-html"
              dangerouslySetInnerHTML={{ __html: buildTimelineHtml(parsed.events, options, t) }}
            />
          </div>
        )
      }}
      toText={(input, options) => {
        try {
          const parsed = parseEvents(input.text, t)
          if (parsed.events.length === 0) return ''
          return buildTimelineHtml(parsed.events, options, t)
        } catch {
          return ''
        }
      }}
      downloadExt="html"
    />
  )
}
