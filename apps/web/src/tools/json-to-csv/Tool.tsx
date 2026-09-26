import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonToCsvInput, JsonToCsvOptions } from './schema'

const EXAMPLE: JsonToCsvInput = {
  text: '[{"id":1,"name":"工具库","tags":["dev","json"],"meta":{"stars":870},"note":null},{"id":2,"name":"另一个","tags":["a"]}]',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<JsonToCsvOptions>[] = [
    {
      key: 'delimiter',
      label: t('option.delimiter'),
      kind: 'select',
      values: ['comma', 'semicolon', 'tab', 'pipe'],
    },
    { key: 'withHeader', label: t('option.withHeader'), kind: 'boolean' },
    { key: 'quote', label: t('option.quote'), kind: 'select', values: ['needed', 'all', 'none'] },
    { key: 'style', label: t('option.style'), kind: 'select', values: ['flatten', 'nested'] },
  ]

  return (
    <TwoColumn<JsonToCsvInput, JsonToCsvOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ delimiter: 'comma', withHeader: true, quote: 'needed', style: 'flatten' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
