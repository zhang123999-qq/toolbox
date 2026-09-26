import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonPathInput, JsonPathOptions } from './schema'

const EXAMPLE: JsonPathInput = {
  text: '{\n  "store": {\n    "book": [\n      { "title": "JSON 入门", "price": 8.95 },\n      { "title": "工具箱笔记", "price": 12.99 }\n    ]\n  }\n}',
}

export default function Tool() {
  const t = useTranslate()

  // 复用通用选项文案（option.*），铺量时无需为每个工具各建一套
  const optionDefs: readonly OptionDef<JsonPathOptions>[] = [
    {
      key: 'pattern',
      label: t('option.pattern'),
      kind: 'text',
      placeholder: '$.store.book[*].title',
    },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['value', 'path'] },
  ]

  return (
    <TwoColumn<JsonPathInput, JsonPathOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ pattern: '$.store.book[*].title', mode: 'value' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
