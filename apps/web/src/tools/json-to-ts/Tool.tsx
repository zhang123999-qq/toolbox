import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToTsInput, JsonToTsOptions } from './schema'

const EXAMPLE: JsonToTsInput = {
  text: '{"id":1,"name":"工具库","tags":["json","ts"],"meta":{"stars":870,"public":true},"note":null}',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<JsonToTsOptions>[] = [
    { key: 'type', label: t('option.type'), kind: 'select', values: ['interface', 'type'] },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['none', 'export', 'declare'] },
    { key: 'style', label: t('option.style'), kind: 'select', values: ['mutable', 'readonly'] },
    { key: 'strict', label: t('option.strict'), kind: 'boolean' },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4', 'tab'] },
  ]

  return (
    <TwoColumn<JsonToTsInput, JsonToTsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        type: 'interface',
        mode: 'none',
        style: 'mutable',
        strict: false,
        indent: '2',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
