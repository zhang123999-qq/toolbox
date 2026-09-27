import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { AverageInput, AverageOptions } from './schema'

/** 示例：10 20 30 40 50 */
const EXAMPLE: AverageInput = { text: '10 20 30 40 50' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<AverageOptions>[] = [
    {
      key: 'decimals',
      label: t('average.option.decimals'),
      kind: 'select',
      values: ['0', '1', '2', '4', '6', '10'],
    },
  ]

  return (
    <TwoColumn<AverageInput, AverageOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ decimals: '4' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
