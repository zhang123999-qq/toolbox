import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToJavaInput, JsonToJavaOptions } from './schema'

const EXAMPLE: JsonToJavaInput = {
  text: '{"id":1,"name":"工具库","tags":["json","java"],"meta":{"stars":870,"public":true},"note":null}',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<JsonToJavaOptions>[] = [
    {
      key: 'style',
      label: t('option.style'),
      kind: 'select',
      values: ['pojo', 'record', 'lombok'],
    },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['public', 'package'] },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4', 'tab'] },
  ]

  return (
    <TwoColumn<JsonToJavaInput, JsonToJavaOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ style: 'pojo', mode: 'public', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
