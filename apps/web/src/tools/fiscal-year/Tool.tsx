import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { FiscalYearInput, FiscalYearOptions } from './schema'

const EXAMPLE: FiscalYearInput = { text: '2025-06-15' }

export default function Tool() {
  const t = useTranslate()
  // i18n 词典里没有「财年起始月」专用文案，借用「类型」标签承载（见 README 对照表）
  const optionDefs: readonly OptionDef<FiscalYearOptions>[] = [
    { key: 'startMonth', label: t('option.type'), kind: 'select', values: ['1', '4', '7', '10'] },
  ]

  return (
    <TwoColumn<FiscalYearInput, FiscalYearOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ startMonth: '1' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
