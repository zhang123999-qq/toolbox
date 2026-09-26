import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { YamlToJsonInput, YamlToJsonOptions } from './schema'

const EXAMPLE: YamlToJsonInput = {
  text: '# 站点配置\nname: 工具库\nport: 8080\ndebug: false\ntags:\n  - yaml\n  - json',
}

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<YamlToJsonOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['yaml2json', 'json2yaml'],
    },
    {
      key: 'indent',
      label: t('option.indent'),
      kind: 'select',
      values: ['2', '4'],
    },
  ]

  return (
    <TwoColumn<YamlToJsonInput, YamlToJsonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'yaml2json', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
