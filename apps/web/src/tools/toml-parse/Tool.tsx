import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TomlInput, TomlOptions } from './schema'

const EXAMPLE: TomlInput = {
  text: [
    '# 应用配置',
    'title = "工具库"',
    'port = 8080',
    'debug = false',
    '',
    '[server]',
    'host = "127.0.0.1"',
    'port = 8080',
    '',
    '[[tags]]',
    'name = "yaml"',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TomlOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['toml2json', 'json2toml'],
    },
    {
      key: 'indent',
      label: t('option.indent'),
      kind: 'select',
      values: ['2', '4'],
    },
  ]

  return (
    <TwoColumn<TomlInput, TomlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'toml2json', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
