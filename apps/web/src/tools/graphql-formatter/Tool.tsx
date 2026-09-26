import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { GraphqlFormatterInput, GraphqlFormatterOptions } from './schema'

const EXAMPLE: GraphqlFormatterInput = {
  text: 'query GetUser($id:ID!,$withPosts:Boolean=false){user(id:$id){id name email ... on Admin {role} posts@include(if:$withPosts){id title}}}',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<GraphqlFormatterOptions>[] = [
    { key: 'indent', label: t('option.indent'), kind: 'select', values: ['2', '4'] },
  ]

  return (
    <TwoColumn<GraphqlFormatterInput, GraphqlFormatterOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
