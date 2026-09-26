import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { YamlToXmlInput, YamlToXmlOptions } from './schema'

const EXAMPLE: YamlToXmlInput = {
  text: 'app:\n  name: 工具库\n  port: 8080\ntags:\n  - yaml\n  - xml',
}

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<YamlToXmlOptions>[] = [
    {
      key: 'indent',
      label: t('option.indent'),
      kind: 'select',
      values: ['2', '4'],
    },
  ]

  return (
    <TwoColumn<YamlToXmlInput, YamlToXmlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
