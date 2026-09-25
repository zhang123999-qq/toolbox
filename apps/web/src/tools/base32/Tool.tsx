import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Base32Input, Base32Options } from './schema'

const EXAMPLE: Base32Input = { text: 'hello' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Base32Options>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encode', 'decode'],
    },
  ]

  return (
    <TwoColumn<Base32Input, Base32Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
