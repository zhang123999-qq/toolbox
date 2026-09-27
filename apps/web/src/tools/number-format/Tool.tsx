import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { NumberFormatInput, NumberFormatOptions } from './schema'

/** 示例：1234567.891 */
const EXAMPLE: NumberFormatInput = { text: '1234567.891' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<NumberFormatOptions>[] = [
    {
      key: 'mode',
      label: t('numberFormat.option.mode'),
      kind: 'select',
      values: ['decimal', 'percent', 'scientific'],
    },
    { key: 'grouping', label: t('numberFormat.option.grouping'), kind: 'boolean' },
    {
      key: 'decimals',
      label: t('numberFormat.option.decimals'),
      kind: 'select',
      values: ['0', '1', '2', '4', '6', '8'],
    },
  ]

  return (
    <TwoColumn<NumberFormatInput, NumberFormatOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'decimal', grouping: true, decimals: '2' }}
      run={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
