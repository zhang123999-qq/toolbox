import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SchemaGenInput, SchemaGenOptions } from './schema'

const EXAMPLE: SchemaGenInput = {
  text: '{\n  "id": 1,\n  "name": "工具库",\n  "tags": ["json", "static"],\n  "meta": { "stars": 12, "private": false }\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<SchemaGenOptions>[] = [
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['draft-07', 'draft-2020-12'],
    },
    { key: 'strict', label: t('option.strict'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<SchemaGenInput, SchemaGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'draft-07', strict: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
