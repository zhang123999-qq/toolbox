import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TrigonometryInput, TrigonometryOptions } from './schema'

/** 示例：30° 的六个三角函数值 */
const EXAMPLE: TrigonometryInput = { text: '30' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<TrigonometryOptions>[] = [
    { key: 'unit', label: t('option.angleUnit'), kind: 'select', values: ['deg', 'rad'] },
  ]

  return (
    <TwoColumn<TrigonometryInput, TrigonometryOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ unit: 'deg' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
