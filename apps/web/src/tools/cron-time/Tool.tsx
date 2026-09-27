import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CronTimeInput, CronTimeOptions } from './schema'

/** 示例：工作日每天 9:00 */
const EXAMPLE: CronTimeInput = { text: '0 9 * * 1-5' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CronTimeOptions>[] = [
    { key: 'count', label: t('option.count'), kind: 'text', placeholder: '5' },
  ]

  return (
    <TwoColumn<CronTimeInput, CronTimeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '5' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
