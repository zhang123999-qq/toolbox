import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { GitCheatsheetInput, GitCheatsheetOptions } from './schema'

const EXAMPLE: GitCheatsheetInput = { text: 'show' }

export default function Tool() {
  const optionDefs: readonly OptionDef<GitCheatsheetOptions>[] = [
    {
      key: 'category',
      label: '分类',
      kind: 'select',
      values: ['all', 'base', 'branch', 'remote', 'undo', 'stage', 'stash', 'log', 'tag'],
    },
  ]

  return (
    <TwoColumn<GitCheatsheetInput, GitCheatsheetOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ category: 'all' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
