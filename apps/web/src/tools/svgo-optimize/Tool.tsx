import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SvgoOptimizeInput, SvgoOptimizeOptions } from './schema'

const EXAMPLE: SvgoOptimizeInput = {
  text: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><!-- 注释 --><circle cx="50.000" cy="50.000" r="40.500" fill="#ff0000" stroke="none" stroke-width="1"/></svg>',
}

export default function Tool() {
  return (
    <TwoColumn<SvgoOptimizeInput, SvgoOptimizeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
