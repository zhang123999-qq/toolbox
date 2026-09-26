import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TerraformConfigInput, TerraformConfigOptions } from './schema'
import { PROVIDERS, RESOURCES } from './schema'

const EXAMPLE: TerraformConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<TerraformConfigOptions>[] = [
    { key: 'provider', label: '云厂商', kind: 'select', values: [...PROVIDERS] },
    { key: 'resource', label: '资源类型', kind: 'select', values: [...RESOURCES] },
  ]
  return (
    <TwoColumn<TerraformConfigInput, TerraformConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ provider: 'aws', resource: 'compute' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
