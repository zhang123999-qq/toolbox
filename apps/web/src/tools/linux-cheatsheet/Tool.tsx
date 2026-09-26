import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { LinuxCheatsheetInput, LinuxCheatsheetOptions } from './schema'

const EXAMPLE: LinuxCheatsheetInput = { text: 'show' }

export default function Tool() {
  const optionDefs: readonly OptionDef<LinuxCheatsheetOptions>[] = [
    {
      key: 'category',
      label: '分类',
      kind: 'select',
      values: [
        'all',
        'file',
        'process',
        'network',
        'permission',
        'disk',
        'user',
        'search',
        'archive',
      ],
    },
  ]
  return (
    <TwoColumn<LinuxCheatsheetInput, LinuxCheatsheetOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ category: 'all' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
