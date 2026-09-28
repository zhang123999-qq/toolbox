import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { formatDateLocaleResults, formatDateLocales, relativeTimeZh } from './utils'
import type { DateLocaleInput, DateLocaleOptions } from './schema'

/** 示例：固定时刻 */
const EXAMPLE: DateLocaleInput = { text: '2026-09-28 15:30:00' }

const DEFAULT_LOCALES = 'zh-CN,en-US,ja-JP,ar-EG'

const optionDefs: readonly OptionDef<DateLocaleOptions>[] = [
  {
    key: 'locales',
    label: '语言区域（逗号分隔）',
    kind: 'text',
    placeholder: 'zh-CN,en-US,ja-JP,ar-EG',
  },
]

function run(input: DateLocaleInput, options: DateLocaleOptions): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  const locales = options.locales.trim() === '' ? DEFAULT_LOCALES : options.locales
  const results = formatDateLocales(text, locales)
  return formatDateLocaleResults(results, relativeTimeZh(text))
}

export default function Tool() {
  return (
    <TwoColumn<DateLocaleInput, DateLocaleOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ locales: DEFAULT_LOCALES }}
      run={run}
      optionDefs={optionDefs}
      idleText="输入日期，选择语言区域后点「运行」，并排对比各 locale 的日期写法"
      example={EXAMPLE}
    />
  )
}
