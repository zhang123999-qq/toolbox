import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CsvToExcelInput, CsvToExcelOptions } from './schema'

const EXAMPLE: CsvToExcelInput = {
  text: 'name,tools,local\n工具库,870,true\n"含,逗号",1,false',
}

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<CsvToExcelOptions>[] = [
    { key: 'format', label: t('option.format'), kind: 'select', values: ['xml', 'csv', 'tsv'] },
    { key: 'header', label: t('option.header'), kind: 'boolean' },
    {
      key: 'delimiter',
      label: t('option.delimiter'),
      kind: 'select',
      values: ['comma', 'tab', 'semicolon', 'pipe'],
    },
  ]

  return (
    <TwoColumn<CsvToExcelInput, CsvToExcelOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'xml', header: true, delimiter: 'comma' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
