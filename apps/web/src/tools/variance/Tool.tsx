import { TwoColumn, type OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { VarianceInput, VarianceOptions } from './schema'

/** 示例：经典数据集 2,4,4,4,5,5,7,9（总体方差为 4） */
const EXAMPLE: VarianceInput = { text: '2, 4, 4, 4, 5, 5, 7, 9' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<VarianceOptions>[] = [
    { key: 'sample', label: t('option.sample'), kind: 'boolean' },
  ]
  return (
    <TwoColumn<VarianceInput, VarianceOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ sample: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
