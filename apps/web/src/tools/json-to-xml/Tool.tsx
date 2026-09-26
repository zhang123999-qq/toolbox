import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToXmlInput, JsonToXmlOptions } from './schema'

const EXAMPLE: JsonToXmlInput = {
  text: '{"id":1,"name":"工具库","active":true,"tags":["json","xml"],"meta":{"stars":870},"note":null}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<JsonToXmlOptions>[] = [
    {
      key: 'rootName',
      label: t('option.rootName'),
      kind: 'text',
      placeholder: 'root',
    },
    { key: 'declaration', label: t('option.xmlDeclaration'), kind: 'boolean' },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4', 'tab'] },
  ]

  return (
    <TwoColumn<JsonToXmlInput, JsonToXmlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ rootName: 'root', declaration: true, indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
