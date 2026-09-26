import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PropertiesInput, PropertiesOptions } from './schema'

const EXAMPLE: PropertiesInput = {
  text: [
    '# 应用配置',
    'app.name = 工具库',
    'app.port = 8080',
    'app.debug = false',
    'legacy.title = \\u5de5\\u5177\\u5e93',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PropertiesOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['props2json', 'json2props'],
    },
    {
      key: 'encoding',
      label: t('option.encoding'),
      kind: 'select',
      values: ['unicode', 'escaped'],
    },
    {
      key: 'indent',
      label: t('option.indent'),
      kind: 'select',
      values: ['2', '4'],
    },
  ]

  return (
    <TwoColumn<PropertiesInput, PropertiesOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'props2json', encoding: 'unicode', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
