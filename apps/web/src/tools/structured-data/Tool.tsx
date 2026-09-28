import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { StructuredDataInput, StructuredDataOptions } from './schema'

const EXAMPLE: StructuredDataInput = {
  text: '<!doctype html>\n<html>\n<head>\n<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"Article","headline":"示例标题"}\n</script>\n</head>\n</html>',
}

export default function Tool() {
  const optionDefs: readonly OptionDef<StructuredDataOptions>[] = [
    {
      key: 'source',
      label: '输入来源',
      kind: 'select',
      values: ['网页 HTML', 'JSON-LD 文本'],
    },
  ]

  return (
    <TwoColumn<StructuredDataInput, StructuredDataOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ source: '网页 HTML' }}
      run={transform}
      idleText="粘贴网页 HTML 或 JSON-LD 文本，逐块校验结构化数据"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
