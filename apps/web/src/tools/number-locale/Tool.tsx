import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { formatNumberLocaleResults, formatNumberLocales } from './utils'
import type { NumberLocaleInput, NumberLocaleOptions } from './schema'

/** 示例：展示分组与数字系统差异的数字 */
const EXAMPLE: NumberLocaleInput = { text: '1234567.89' }

const DEFAULT_LOCALES = 'en-US,de-DE,ar-EG,en-IN'

const optionDefs: readonly OptionDef<NumberLocaleOptions>[] = [
  {
    key: 'locales',
    label: '语言区域（逗号分隔）',
    kind: 'text',
    placeholder: 'en-US,de-DE,ar-EG,en-IN',
  },
]

function run(input: NumberLocaleInput, options: NumberLocaleOptions): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  const locales = options.locales.trim() === '' ? DEFAULT_LOCALES : options.locales
  return formatNumberLocaleResults(formatNumberLocales(text, locales))
}

export default function Tool() {
  return (
    <TwoColumn<NumberLocaleInput, NumberLocaleOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ locales: DEFAULT_LOCALES }}
      run={run}
      optionDefs={optionDefs}
      idleText="输入数字，选择语言区域后点「运行」，并排对比各 locale 的数字写法"
      example={EXAMPLE}
    />
  )
}
