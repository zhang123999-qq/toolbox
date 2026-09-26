import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CidrInput, CidrOptions } from './schema'

const EXAMPLE: CidrInput = { text: '192.168.1.0/24' }

export default function Tool() {
  return (
    <TwoColumn<CidrInput, CidrOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
