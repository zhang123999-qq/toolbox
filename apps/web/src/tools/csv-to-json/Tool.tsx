import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CsvToJsonInput, CsvToJsonOptions } from './schema'

const EXAMPLE: CsvToJsonInput = {
  text: 'name,tools,local\n工具库,870,true\n"含,逗号",1,false',
}

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<CsvToJsonOptions>[] = [
    { key: 'header', label: t('option.header'), kind: 'boolean' },
    {
      key: 'delimiter',
      label: t('option.delimiter'),
      kind: 'select',
      values: ['comma', 'tab', 'semicolon', 'pipe'],
    },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['0', '2', '4'] },
  ]

  return (
    <TwoColumn<CsvToJsonInput, CsvToJsonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ header: true, delimiter: 'comma', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
