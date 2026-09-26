import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { YamlFormatterInput, YamlFormatterOptions } from './schema'

const EXAMPLE: YamlFormatterInput = {
  text: '# 应用配置\nname: 工具库\nport: 8080\ndebug: false\ntags:\n  - yaml\n  - format',
}

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<YamlFormatterOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['format', 'validate'],
    },
    {
      key: 'indent',
      label: t('option.indent'),
      kind: 'select',
      values: ['2', '4'],
    },
    { key: 'sortKeys', label: t('option.sortKeys'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<YamlFormatterInput, YamlFormatterOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'format', indent: '2', sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
