import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { CURRENCY_IDS } from '../../lib/currency'
import { meta } from './meta'
import { DECIMAL_CHOICES, DISPLAY_MODES, LOCALE_IDS, transform } from './utils'
import type { CurrencyInput, CurrencyOptions } from './schema'

/** 示例：1,234,567.89 */
const EXAMPLE: CurrencyInput = { text: '1234567.89' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CurrencyOptions>[] = [
    { key: 'currency', label: t('currency.currency'), kind: 'select', values: CURRENCY_IDS },
    { key: 'locale', label: t('currency.locale'), kind: 'select', values: LOCALE_IDS },
    { key: 'display', label: t('currency.display'), kind: 'select', values: DISPLAY_MODES },
    { key: 'decimals', label: t('currency.decimals'), kind: 'select', values: DECIMAL_CHOICES },
  ]

  return (
    <TwoColumn<CurrencyInput, CurrencyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ currency: 'CNY', locale: 'zh-CN', display: 'symbol', decimals: 'auto' }}
      run={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
