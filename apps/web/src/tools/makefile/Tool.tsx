import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { MakefileInput, MakefileOptions } from './schema'

const EXAMPLE: MakefileInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<MakefileOptions>[] = [
    { key: 'targetName', label: '目标名', kind: 'text', placeholder: 'build' },
    { key: 'deps', label: '依赖', kind: 'text', placeholder: 'all 可选' },
    { key: 'command', label: '命令', kind: 'text', placeholder: '@echo done' },
  ]

  return (
    <TwoColumn<MakefileInput, MakefileOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ targetName: 'build', deps: '', command: '@echo done' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
