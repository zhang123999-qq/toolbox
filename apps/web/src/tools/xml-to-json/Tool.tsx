import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { XmlToJsonInput, XmlToJsonOptions } from './schema'

const EXAMPLE: XmlToJsonInput = {
  text: '<catalog>\n  <book id="1"><title>工具库</title><price>29.9</price></book>\n  <book id="2"><title>XML 入门</title><price>39</price></book>\n</catalog>',
}

export default function Tool() {
  const t = useTranslate()

  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<XmlToJsonOptions>[] = [
    { key: 'prefix', label: t('option.prefix'), kind: 'select', values: ['@', '_', '$'] },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['auto', 'always', 'never'] },
    {
      key: 'textKey',
      label: t('option.format'),
      kind: 'select',
      values: ['#text', 'value', 'text'],
    },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['0', '2', '4'] },
  ]

  return (
    <TwoColumn<XmlToJsonInput, XmlToJsonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ prefix: '@', mode: 'auto', textKey: '#text', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
