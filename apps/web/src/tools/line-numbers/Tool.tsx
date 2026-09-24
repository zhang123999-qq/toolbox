import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { LineNumbersInput, LineNumbersOptions } from './schema'

const EXAMPLE: LineNumbersInput = { text: '第一行\n第二行\n第三行' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<LineNumbersOptions>[] = [
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['dot', 'colon', 'pipe', 'bracket'],
    },
    { key: 'align', label: t('option.align'), kind: 'boolean' },
    { key: 'skipEmpty', label: t('option.skipEmpty'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<LineNumbersInput, LineNumbersOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'dot', align: true, skipEmpty: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
