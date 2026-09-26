import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { AvroParseInput, AvroParseOptions } from './schema'

const EXAMPLE: AvroParseInput = {
  text: JSON.stringify(
    {
      type: 'record',
      name: 'User',
      namespace: 'com.example',
      fields: [
        { name: 'id', type: 'long' },
        { name: 'name', type: 'string' },
        { name: 'email', type: ['null', 'string'], default: null },
        { name: 'role', type: { type: 'enum', name: 'Role', symbols: ['ADMIN', 'USER'] } },
        { name: 'tags', type: { type: 'array', items: 'string' } },
        { name: 'created_at', type: { type: 'long', logicalType: 'timestamp-millis' } },
      ],
    },
    null,
    2,
  ),
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<AvroParseOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['both', 'tree', 'jsonSchema'],
    },
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4'] },
  ]

  return (
    <TwoColumn<AvroParseInput, AvroParseOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'both', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
