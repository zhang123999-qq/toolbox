import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DuplicateCodeInput, DuplicateCodeOptions } from './schema'

const EXAMPLE: DuplicateCodeInput = {
  text: `function a() {
  console.log('x')
  console.log('x')
  console.log('x')
}
function b() {
  console.log('x')
  console.log('x')
}
`,
}

export default function Tool() {
  const optionDefs: readonly OptionDef<DuplicateCodeOptions>[] = [
    { key: 'minBlock', label: '最小重复次数', kind: 'text', placeholder: '3' },
  ]

  return (
    <TwoColumn<DuplicateCodeInput, DuplicateCodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ minBlock: 3 }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="粘贴代码，按行级 hash 找出重复行与重复块"
    />
  )
}
