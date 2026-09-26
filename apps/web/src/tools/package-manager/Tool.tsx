import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { PackageManagerInput, PackageManagerOptions } from './schema'

const EXAMPLE: PackageManagerInput = { text: 'cheatsheet' }

export default function Tool() {
  const optionDefs: readonly OptionDef<PackageManagerOptions>[] = [
    { key: 'pm', label: '包管理器', kind: 'select', values: ['npm', 'yarn', 'pnpm'] },
  ]

  return (
    <TwoColumn<PackageManagerInput, PackageManagerOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ pm: 'pnpm' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
