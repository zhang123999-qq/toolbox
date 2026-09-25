import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Base64Input, Base64Options } from './schema'

const EXAMPLE: Base64Input = { text: '工具库 Toolbox' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Base64Options>[] = [
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
      values: ['standard', 'urlsafe'],
    },
  ]

  return (
    <TwoColumn<Base64Input, Base64Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', mode: 'standard' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
