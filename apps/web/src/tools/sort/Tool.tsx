import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SortInput, SortOptions } from './schema'

const EXAMPLE: SortInput = { text: 'banana\napple\ncherry' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SortOptions>[] = [
    {
      key: 'sortBy',
      label: t('option.sortBy'),
      kind: 'select',
      values: ['text', 'number', 'length'],
    },
    { key: 'descending', label: t('option.descending'), kind: 'boolean' },
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<SortInput, SortOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ sortBy: 'text', descending: false, ignoreCase: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
