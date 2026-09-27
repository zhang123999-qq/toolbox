import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { FractionInput, FractionOptions } from './schema'

/** 示例：1/2 + 1/3 */
const EXAMPLE: FractionInput = { text: '1/2 + 1/3' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<FractionOptions>[] = [
    {
      key: 'decimals',
      label: t('fraction.option.decimals'),
      kind: 'select',
      values: ['2', '4', '6', '10', '16'],
    },
  ]

  return (
    <TwoColumn<FractionInput, FractionOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ decimals: '10' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
