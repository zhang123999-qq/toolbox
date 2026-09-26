import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { IniInput, IniOptions } from './schema'

const EXAMPLE: IniInput = {
  text: [
    '; 应用配置',
    'name = 工具库',
    'port = 8080',
    'debug = false',
    '',
    '[server]',
    'host = 127.0.0.1',
    'port = 9090',
    '',
    '[server.tls]',
    'enabled = true',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<IniOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['ini2json', 'json2ini'],
    },
    {
      key: 'indent',
      label: t('option.indent'),
      kind: 'select',
      values: ['2', '4'],
    },
  ]

  return (
    <TwoColumn<IniInput, IniOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'ini2json', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
