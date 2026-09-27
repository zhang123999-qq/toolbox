import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CalculatorInput, CalculatorOptions } from './schema'

/** 示例：sqrt(2^10) + sin(45°) */
const EXAMPLE: CalculatorInput = { text: 'sqrt(2^10) + sin(45 deg)' }

export default function Tool() {
  return (
    <TwoColumn<CalculatorInput, CalculatorOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
