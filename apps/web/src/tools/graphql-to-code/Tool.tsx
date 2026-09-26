import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { GraphqlToCodeInput, GraphqlToCodeOptions } from './schema'

const EXAMPLE: GraphqlToCodeInput = {
  text: [
    'query GetUser($id: ID!, $first: Int = 10) {',
    '  user(id: $id) {',
    '    id',
    '    name',
    '    posts(first: $first) {',
    '      title',
    '    }',
    '  }',
    '}',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<GraphqlToCodeOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['both', 'variables', 'result'],
    },
    { key: 'strict', label: t('option.strict'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<GraphqlToCodeInput, GraphqlToCodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'both', strict: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
