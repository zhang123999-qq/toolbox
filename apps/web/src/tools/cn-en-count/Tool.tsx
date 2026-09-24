import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CnEnInput, CnEnOptions } from './schema'

const EXAMPLE: CnEnInput = { text: 'Toolbox 是一个工具库，共有 870 个工具。' }

export default function Tool() {
  return (
    <TwoColumn<CnEnInput, CnEnOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
