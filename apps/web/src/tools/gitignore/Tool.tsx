import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform, LABELS } from './utils'
import type { GitignoreInput, GitignoreOptions } from './schema'

const EXAMPLE: GitignoreInput = { text: 'generate' }

const ALL_KEYS = Object.keys(LABELS) as (keyof GitignoreOptions)[]

export default function Tool() {
  const initial = ALL_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {} as GitignoreOptions)
  const optionDefs: readonly OptionDef<GitignoreOptions>[] = ALL_KEYS.map((k) => ({
    key: k,
    label: LABELS[k],
    kind: 'boolean',
  }))

  return (
    <TwoColumn<GitignoreInput, GitignoreOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ ...initial, node: true, macos: true, windows: true, ide: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
