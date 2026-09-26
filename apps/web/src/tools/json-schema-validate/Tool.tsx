import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SchemaValidateInput, SchemaValidateOptions } from './schema'

const EXAMPLE_DATA = '{\n  "id": 1,\n  "name": "工具库",\n  "price": 8.95\n}'

const EXAMPLE_SCHEMA = `{
  "type": "object",
  "required": ["id", "name"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "name": { "type": "string", "minLength": 2 },
    "price": { "type": "number" }
  }
}`

const EXAMPLE: SchemaValidateInput = { text: EXAMPLE_DATA, textB: EXAMPLE_SCHEMA }

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<SchemaValidateOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['all', 'first'] },
    { key: 'strict', label: t('option.strict'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<SchemaValidateInput, SchemaValidateOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'all', strict: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('tool.otherText'), rows: 8 }]}
    />
  )
}
