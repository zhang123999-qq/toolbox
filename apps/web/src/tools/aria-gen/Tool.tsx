import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  ARIA_TYPES,
  ARIA_TYPE_NAMES,
  buildAriaSnippet,
  parseAriaOptions,
  parseAriaType,
} from './utils'
import type { AriaGenInput, AriaGenOptions } from './schema'

/** 示例：对话框 */
const EXAMPLE: AriaGenInput = { text: '确认删除对话框' }

function run(input: AriaGenInput, options: AriaGenOptions): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  const type = parseAriaType(options.type || 'dialog')
  const opts = parseAriaOptions({
    label: text,
    id: options.id,
    describedBy: options.describedBy,
    min: options.min,
    max: options.max,
    value: options.value,
  })
  const snippet = buildAriaSnippet(type, opts)
  return [
    `<!-- ${ARIA_TYPE_NAMES[type]}：${text} -->`,
    snippet.html,
    '',
    '使用说明：',
    ...snippet.notes.map((n, i) => `${i + 1}. ${n}`),
  ].join('\n')
}

export default function Tool() {
  const optionDefs: readonly OptionDef<AriaGenOptions>[] = [
    { key: 'type', label: '组件类型', kind: 'select', values: [...ARIA_TYPES] },
    { key: 'id', label: 'id', kind: 'text', placeholder: '可选' },
    { key: 'describedBy', label: 'describedBy', kind: 'text', placeholder: '可选' },
    { key: 'min', label: '最小值', kind: 'text', placeholder: '滑块用' },
    { key: 'max', label: '最大值', kind: 'text', placeholder: '滑块用' },
    { key: 'value', label: '当前值', kind: 'text', placeholder: '滑块用' },
  ]

  return (
    <TwoColumn<AriaGenInput, AriaGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ type: 'dialog', id: '', describedBy: '', min: '', max: '', value: '' }}
      run={run}
      idleText="输入组件名称、选择组件类型后点「运行」，生成 ARIA 代码片段与使用说明"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
