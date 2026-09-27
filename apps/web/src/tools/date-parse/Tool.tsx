import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DateParseInput, DateParseOptions } from './schema'

/** 示例：一个中文相对日期 */
const EXAMPLE: DateParseInput = { text: '下周一' }

export default function Tool() {
  return (
    <TwoColumn<DateParseInput, DateParseOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
