import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SemverCompareInput, SemverCompareOptions } from './schema'

const EXAMPLE: SemverCompareInput = { text: '1.2.3\n1.2.4-beta.1' }

export default function Tool() {
  return (
    <TwoColumn<SemverCompareInput, SemverCompareOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      idleText="分两行填写两个版本号：第一行 A，第二行 B，按 SemVer 2.0.0 比较"
    />
  )
}
