import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { DateCalcInput, DateCalcOptions } from './schema'

/** 示例：2024-02-29 加 1 年 → 2025-02-28 */
const EXAMPLE: DateCalcInput = { text: '2024-02-29' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<DateCalcOptions>[] = [
    { key: 'op', label: '操作', kind: 'select', values: ['add', 'subtract'] },
    { key: 'amount', label: '数量', kind: 'text', placeholder: '1' },
    {
      key: 'unit',
      label: t('option.unit'),
      kind: 'select',
      values: ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'],
    },
  ]

  return (
    <TwoColumn<DateCalcInput, DateCalcOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ op: 'add', amount: '1', unit: 'year' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
