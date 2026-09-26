import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CronParserInput, CronParserOptions } from './schema'

/** 示例：工作日凌晨 2 点 */
const EXAMPLE: CronParserInput = { text: '0 2 * * 1-5' }

export default function Tool() {
  return (
    <TwoColumn<CronParserInput, CronParserOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
