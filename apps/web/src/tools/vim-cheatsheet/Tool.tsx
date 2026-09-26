import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { VimCheatsheetInput, VimCheatsheetOptions } from './schema'

const EXAMPLE: VimCheatsheetInput = { text: 'show' }

export default function Tool() {
  const optionDefs: readonly OptionDef<VimCheatsheetOptions>[] = [
    {
      key: 'category',
      label: '分类',
      kind: 'select',
      values: ['all', 'motion', 'edit', 'search', 'visual', 'register', 'window', 'mode'],
    },
  ]
  return (
    <TwoColumn<VimCheatsheetInput, VimCheatsheetOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ category: 'all' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
