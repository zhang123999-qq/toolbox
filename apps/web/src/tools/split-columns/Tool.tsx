import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SplitColumnsInput, SplitColumnsOptions } from './schema'

const EXAMPLE: SplitColumnsInput = { text: 'name,age,city\nBob,7,Beijing\nAmy,9,Shanghai' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SplitColumnsOptions>[] = [
    {
      key: 'delimiter',
      label: t('option.delimiter'),
      kind: 'select',
      values: ['auto', 'comma', 'tab', 'semicolon', 'pipe', 'space'],
    },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['list', 'numbered', 'count'] },
  ]

  return (
    <TwoColumn<SplitColumnsInput, SplitColumnsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ delimiter: 'auto', mode: 'list' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
