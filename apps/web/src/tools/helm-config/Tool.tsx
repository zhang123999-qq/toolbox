import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { HelmConfigInput, HelmConfigOptions } from './schema'

const EXAMPLE: HelmConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<HelmConfigOptions>[] = [
    { key: 'chartName', label: 'Chart 名', kind: 'text', placeholder: 'mychart' },
    { key: 'version', label: '版本', kind: 'text', placeholder: '0.1.0' },
    { key: 'description', label: '描述', kind: 'text', placeholder: 'A Helm chart' },
  ]
  return (
    <TwoColumn<HelmConfigInput, HelmConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ chartName: '', version: '', description: '' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
