import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { CURRENCY_IDS } from '../../lib/currency'
import { meta } from './meta'
import { transform } from './utils'
import type { ExchangeRateInput, ExchangeRateOptions } from './schema'

/** 示例：100 美元（实际调用需自备 API Key，不在示例里放任何 Key） */
const EXAMPLE: ExchangeRateInput = { text: '100', apiKey: '' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<ExchangeRateOptions>[] = [
    { key: 'from', label: t('exchangeRate.from'), kind: 'select', values: CURRENCY_IDS },
    { key: 'to', label: t('exchangeRate.to'), kind: 'select', values: CURRENCY_IDS },
  ]

  return (
    <TwoColumn<ExchangeRateInput, ExchangeRateOptions>
      meta={meta}
      initialInput={{ text: '', apiKey: '' }}
      initialOptions={{ from: 'USD', to: 'CNY' }}
      runAsync={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'apiKey', label: t('tool.apiKey'), rows: 1, secret: true }]}
      idleText={t('exchangeRate.idle')}
    />
  )
}
