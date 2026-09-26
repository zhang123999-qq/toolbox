import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CsvFormatterInput, CsvFormatterOptions } from './schema'

const EXAMPLE: CsvFormatterInput = {
  text: 'name,tools,local\n工具库,870,true\n"含,逗号",1,false',
}

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<CsvFormatterOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['align', 'minify', 'validate'],
    },
    {
      key: 'delimiter',
      label: t('option.delimiter'),
      kind: 'select',
      values: ['comma', 'tab', 'semicolon', 'pipe'],
    },
    { key: 'strict', label: t('option.strict'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<CsvFormatterInput, CsvFormatterOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'align', delimiter: 'comma', strict: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
