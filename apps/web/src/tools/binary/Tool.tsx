import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BinaryInput, BinaryOptions } from './schema'

const EXAMPLE: BinaryInput = { text: '255' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BinaryOptions>[] = [
    {
      key: 'source',
      label: t('option.source'),
      kind: 'select',
      values: ['2', '8', '10', '16'],
    },
    {
      key: 'target',
      label: t('option.target'),
      kind: 'select',
      values: ['2', '8', '10', '16'],
    },
    {
      key: 'separator',
      label: t('option.separator'),
      kind: 'select',
      values: ['none', '4', '8'],
    },
  ]

  return (
    <TwoColumn<BinaryInput, BinaryOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ source: '10', target: '2', separator: '4' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
