import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CronNextInput, CronNextOptions } from './schema'

/** 示例：工作日凌晨 2 点 */
const EXAMPLE: CronNextInput = { text: '0 2 * * 1-5' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CronNextOptions>[] = [
    { key: 'count', label: t('option.count'), kind: 'text', placeholder: '5' },
  ]

  return (
    <TwoColumn<CronNextInput, CronNextOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '5' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
