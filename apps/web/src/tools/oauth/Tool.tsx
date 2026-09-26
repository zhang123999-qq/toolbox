import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { OAuthInput, OAuthOptions } from './schema'

const EXAMPLE: OAuthInput = { text: 'show' }

export default function Tool() {
  const optionDefs: readonly OptionDef<OAuthOptions>[] = [
    {
      key: 'flow',
      label: '授权流程',
      kind: 'select',
      values: ['authorization-code', 'implicit', 'client-credentials'],
    },
  ]

  return (
    <TwoColumn<OAuthInput, OAuthOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ flow: 'authorization-code' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
