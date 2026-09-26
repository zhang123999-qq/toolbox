import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { DEFAULT_TEMPLATE, transform } from './utils'
import type { MockDataInput, MockDataOptions } from './schema'

const EXAMPLE: MockDataInput = { text: JSON.stringify(DEFAULT_TEMPLATE, null, 2) }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<MockDataOptions>[] = [
    {
      key: 'count',
      label: t('option.count'),
      kind: 'select',
      values: ['1', '5', '10', '20', '50'],
    },
    { key: 'stable', label: t('option.stable'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<MockDataInput, MockDataOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '5', stable: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
