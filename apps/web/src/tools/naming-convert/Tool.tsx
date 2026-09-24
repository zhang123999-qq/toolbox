import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { NamingConvertInput, NamingConvertOptions } from './schema'

const EXAMPLE: NamingConvertInput = { text: 'hello toolbox world' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<NamingConvertOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['camel', 'pascal', 'snake', 'kebab', 'constant'],
    },
  ]

  return (
    <TwoColumn<NamingConvertInput, NamingConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'camel' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
