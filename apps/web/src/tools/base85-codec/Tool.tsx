import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Base85Input, Base85Options } from './schema'

const EXAMPLE: Base85Input = { text: 'Man ' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Base85Options>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encode', 'decode'],
    },
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['ascii85', 'z85'],
    },
  ]

  return (
    <TwoColumn<Base85Input, Base85Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', mode: 'ascii85' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
